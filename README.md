# COOPAF - Sistema de Gestão

Aplicação web para gestão de uma cooperativa: clientes, fornecedores (cooperados), produtos,
estoque, aquisições (compras de fornecedores) e pedidos (vendas para clientes).

## Stack

- [Next.js 16](https://nextjs.org) (App Router) + React 19 + TypeScript
- Tailwind CSS 4
- [Prisma 7](https://www.prisma.io) com PostgreSQL (`@prisma/adapter-pg`)

## Como rodar

Pré-requisitos: Node.js 20+ e um banco PostgreSQL.

```bash
npm install
cp .env.example .env          # preencha DATABASE_URL
npx prisma migrate dev        # aplica as migrations e gera o cliente Prisma
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000).

Para popular o banco com dados de exemplo: `npx tsx script.ts`.

## Estrutura

```
app/
  page.tsx                      Dashboard
  <entidade>/page.tsx           Listagem
  <entidade>/new/page.tsx       Cadastro
  <entidade>/manage/[id]/       Edição / exclusão
  api/<entidade>/route.ts       GET (lista) / POST
  api/<entidade>/[id]/route.ts  GET / PUT / DELETE
components/                     Tabela, formulário genérico, header e navbar
lib/
  prisma.ts                     Instância do PrismaClient
  api.ts                        Validação de entrada e tratamento de erros das rotas
  fields.ts                     Campos aceitos por cada entidade nas rotas
  pedidos.ts                    Regras de itens do pedido e baixa de estoque
prisma/                         Schema e migrations
```

Entidades (`/api/...`): `customers`, `suppliers`, `products`, `stock`, `acquisitions`, `orders`.

## Regras de negócio

- **Aquisição** (`POST /api/acquisitions`): registra a compra de um produto de um fornecedor e
  soma a quantidade ao estoque do produto (criando o estoque se ainda não existir).
  Um produto pode ter várias aquisições (histórico preservado).
- **Pedido** (`POST/PUT/DELETE /api/orders`): os itens do carrinho são gravados em `ItemPedido`
  e a quantidade é baixada do estoque. O pedido é recusado se algum produto não tiver estoque
  suficiente. Ao editar, os itens antigos são devolvidos ao estoque antes de aplicar os novos;
  ao excluir, todo o estoque do pedido é devolvido. O total é calculado no servidor
  (soma dos itens com o preço cadastrado do produto, menos o desconto).
- **Produto**: ao editar nome, categoria ou preço, os mesmos campos são atualizados no estoque
  vinculado. Um produto que já aparece em pedidos não pode ser excluído.
- As rotas de escrita aceitam apenas os campos conhecidos de cada entidade
  (ver `lib/fields.ts`) e respondem `400` para dados inválidos, `404` para registro
  inexistente e `409` para conflitos (duplicidade ou vínculos).

## Scripts

| Comando         | Descrição                    |
| --------------- | ---------------------------- |
| `npm run dev`   | Servidor de desenvolvimento  |
| `npm run build` | Build de produção            |
| `npm run start` | Servidor de produção         |
| `npm run lint`  | ESLint                       |

## Testes de sistema

`tests/sistema/sistema.mjs` testa o **sistema completo e integrado** (servidor + API + banco), sem mocks.
Ele cobre os requisitos funcionais de todas as classes (cadastros, aquisições e estoque, pedidos e itens, validação
de entrada, exclusão) e um requisito não funcional: o **tempo de resposta** de cada requisição.

```bash
npx prisma migrate deploy   # banco com o schema atualizado
npm run dev                 # em um terminal
node tests/sistema/sistema.mjs   # em outro terminal
```

Variáveis opcionais: `BASE_URL` (padrão `http://localhost:3000`) e `LIMITE_MS` (tempo máximo por requisição,
padrão `3000`).

Para avaliar o tempo de resposta de forma justa, rode o app em modo produção (`npm run build && npm start`):
no `npm run dev` a primeira chamada de cada rota inclui o tempo de compilação.

> O teste cria registros (com o sufixo `E2E-<execução>`) no banco que o servidor estiver usando e os apaga ao
> final. Use um banco de desenvolvimento ou de teste, nunca o de produção.

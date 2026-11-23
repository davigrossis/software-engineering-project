---
name: teste-integracao
description: Escreve testes de integração (Vitest, padrão AAA) que chamam as rotas da API com o Prisma e um banco PostgreSQL de teste reais, verificando a comunicação entre a lógica e o banco para uma classe do projeto — Cliente, Fornecedor, Produto, Estoque, Aquisicao ou Pedido/ItemPedido. Use quando pedirem testes de integração.
argument-hint: <Classe>   ex.: Aquisicao
---

# Testes de integração — $ARGUMENTS

Testes de integração verificam a **comunicação entre módulos**: aqui, a rota da API (`app/api/**`) +
as regras de `lib/` + o Prisma + um **banco PostgreSQL de teste de verdade**. Sem mocks.

| Nível | O que usa | Onde fica |
|---|---|---|
| Unidade | uma função isolada, sem banco | `lib/<classe>.test.ts` (skill `/teste-unitario`) |
| **Integração** | **rota + Prisma + banco de teste**, sem servidor HTTP | `tests/integracao/<classe>.test.ts` |
| Sistema | servidor rodando + API + banco, via HTTP | `tests/sistema/sistema.mjs` |

## ⚠️ Segurança do banco
Os testes **apagam todas as tabelas antes de cada teste**. Por isso:
- rodam **somente** com a `DATABASE_URL` do arquivo `.env.test`, que deve apontar para um **banco só de teste**;
- a configuração se recusa a rodar se o `.env.test` não existir ou apontar para o mesmo banco do `.env`;
- **nunca** coloque no `.env.test` a URL do banco principal.

## Antes de começar (cada pessoa, uma vez)
1. Crie um banco de teste grátis: `npx create-db@latest` (Prisma Postgres; dura 24 h sem "claim").
2. Crie o arquivo `.env.test` na raiz (o git já ignora): `DATABASE_URL="postgres://..."` — use a URL **direta** (`postgres://`).
3. Aplique as migrations nele: `DATABASE_URL="<url do .env.test>" npx prisma migrate deploy`.
4. Rode `npm run test:integracao` para conferir.

## Configuração do projeto (uma única vez, pelo @davigrossis)
Se `vitest.integracao.config.mts` já existir, pule esta seção e **não a altere**.

1. `vitest.integracao.config.mts` na raiz:
   ```ts
   import { existsSync, readFileSync } from 'node:fs';
   import { fileURLToPath } from 'node:url';
   import { parse } from 'dotenv';
   import { defineConfig } from 'vitest/config';

   const urlDe = (arquivo: string) =>
     existsSync(arquivo) ? parse(readFileSync(arquivo)).DATABASE_URL : undefined;
   const urlTeste = urlDe('.env.test');
   if (!urlTeste) throw new Error('Crie o arquivo .env.test com a DATABASE_URL de um banco de TESTE.');
   if (urlTeste === urlDe('.env')) throw new Error('.env.test aponta para o mesmo banco do .env: use um banco só de teste.');

   export default defineConfig({
     resolve: { alias: { '@': fileURLToPath(new URL('./', import.meta.url)) } },
     test: {
       globals: true,
       environment: 'node',
       include: ['tests/integracao/**/*.test.ts'],
       setupFiles: ['./tests/integracao/setup.ts'],
       env: { DATABASE_URL: urlTeste }, // tem prioridade sobre o .env
       fileParallelism: false,          // um banco compartilhado: um arquivo por vez
       testTimeout: 20_000,
     },
   });
   ```
2. `tests/integracao/setup.ts` — banco limpo antes de cada teste:
   ```ts
   import { prisma } from '@/lib/prisma';

   const TABELAS = ['ItemPedido', 'Pedido', 'Aquisicao', 'Produto', 'Estoque', 'Cliente', 'Fornecedor'];

   beforeEach(async () => {
     await prisma.$executeRawUnsafe(`TRUNCATE ${TABELAS.map(t => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`);
   });

   afterAll(async () => {
     await prisma.$disconnect();
   });
   ```
3. `tests/integracao/helpers.ts` — monta as requisições para os handlers:
   ```ts
   export const requisicao = (metodo: string, corpo?: unknown) =>
     new Request('http://teste/api', { method: metodo, body: corpo === undefined ? undefined : JSON.stringify(corpo) });

   export const params = (id: number | string) => ({ params: Promise.resolve({ id: String(id) }) });
   ```
4. `package.json` → `"test:integracao": "vitest run --config vitest.integracao.config.mts"`.

## Passos
1. Veja na tabela abaixo o que cobrir para `$ARGUMENTS` e confira na rota se a regra ainda vale.
2. Liste os testes (um `it` por regra) e mostre **antes** de escrever.
3. Escreva em `tests/integracao/<classe>.test.ts` seguindo o modelo AAA.
4. Rode `npm run test:integracao` até passar e mostre a saída real do comando.

## Regras
- Todo teste com `// Arrange`, `// Act`, `// Assert`.
- **Arrange** cria os dados direto com o `prisma` (rápido e explícito).
- **Act** chama o **handler da rota** (`POST`, `GET`, `PUT`, `DELETE` importados de `@/app/api/...`).
- **Assert** confere a **resposta** (status e corpo) **e o estado no banco** (consulta com o `prisma`) —
  é isso que torna o teste de integração.
- Em caso de erro, confira também que **nada foi gravado** (ex.: rollback da transação).
- Sem mocks e sem `vi.fn()`: tudo real. Cada teste começa com o banco vazio (o `setup.ts` limpa).
- Um comportamento por `it`, nome `deve ...`, agrupado em `describe('<Classe> (integração)')`.
- Nunca pule ou apague um teste que falha: corrija o teste ou avise que encontrou um bug.

## Modelo AAA
```ts
import { POST } from '@/app/api/acquisitions/route';
import { prisma } from '@/lib/prisma';
import { requisicao } from './helpers';

describe('Aquisicao (integração)', () => {
  it('deve somar a quantidade ao estoque do produto no banco', async () => {
    // Arrange
    const fornecedor = await prisma.fornecedor.create({ data: { nome: 'Cooperado Teste' } });
    const produto = await prisma.produto.create({
      data: { nome: 'Alface', codigo_produto: 'ALF-1', categoria: 'Hortaliças', preco: 3 },
    });

    // Act
    const resposta = await POST(requisicao('POST', {
      id_fornecedor: fornecedor.id, id_produto: produto.id, quantidade: 10, preco: 3,
    }));

    // Assert
    expect(resposta.status).toBe(201);
    const noBanco = await prisma.produto.findUnique({ where: { id: produto.id }, include: { estoque: true } });
    expect(noBanco?.estoque?.quantidade).toBe(10);
  });

  it('deve recusar fornecedor inexistente sem gravar a aquisição', async () => {
    // Arrange
    const produto = await prisma.produto.create({
      data: { nome: 'Alface', codigo_produto: 'ALF-1', categoria: 'Hortaliças', preco: 3 },
    });

    // Act
    const resposta = await POST(requisicao('POST', {
      id_fornecedor: 999, id_produto: produto.id, quantidade: 10, preco: 3,
    }));

    // Assert
    expect(resposta.status).toBe(400);
    expect(await prisma.aquisicao.count()).toBe(0);
  });
});
```
Rotas com `[id]`: `await PUT(requisicao('PUT', { preco: 9 }), params(produto.id))`.

## O que cobrir por classe
| Classe | Arquivo | Rotas | O que verificar no banco |
|---|---|---|---|
| Cliente | `tests/integracao/cliente.test.ts` | `customers` | POST grava só os campos permitidos; CNPJ duplicado → 409 e continua 1 registro; PUT atualiza; DELETE remove; GET lista do mais novo ao mais antigo |
| Fornecedor | `tests/integracao/fornecedor.test.ts` | `suppliers` | POST/PUT/DELETE refletem no banco; excluir fornecedor com aquisição → 409 e ele continua no banco |
| Produto | `tests/integracao/produto.test.ts` | `products` | código duplicado → 409; PUT sincroniza nome/categoria/preço no estoque vinculado; DELETE com item de pedido → 409 e o produto continua; DELETE sem pedido remove e as aquisições ficam com `id_produto` nulo |
| Estoque | `tests/integracao/estoque.test.ts` | `stock` | POST cria estoque com os dados do produto e grava `produto.id_estoque`; segundo estoque do mesmo produto → 400 e nada é criado; PUT negativo → 400 e a quantidade não muda |
| Aquisicao | `tests/integracao/aquisicao.test.ts` | `acquisitions` | POST grava `id_produto` e soma ao estoque existente; sem estoque, cria e vincula ao produto; fornecedor/produto inexistente → 400 e nenhuma aquisição gravada; GET traz o produto e o `valor_total` |
| Pedido / ItemPedido | `tests/integracao/pedido.test.ts` | `orders` | POST grava os `ItemPedido` com o preço do cadastro e dá baixa no estoque; estoque insuficiente → 400, **nenhum pedido ou item gravado e estoque intacto**; PUT troca os itens e reajusta o estoque; DELETE devolve o estoque e apaga os itens |

# Contexto do projeto

## Propósito
Sistema web de gestão da **COOPAF — Cooperativa dos Produtores da Agricultura Familiar Solidária**.
A cooperativa compra a produção dos seus cooperados (agricultores familiares) e a revende para
instituições compradoras (identificadas por CNPJ). O sistema substitui o controle manual dessas
operações: cadastros, compras, estoque e vendas.

## Objetivo
- Centralizar o cadastro de clientes, fornecedores (cooperados) e produtos.
- Registrar cada compra feita de um fornecedor (**aquisição**) e cada venda para um cliente (**pedido**).
- Manter o **estoque** sempre coerente com as compras e as vendas, sem permitir vender o que não existe.
- Projeto acadêmico da disciplina de Engenharia de Software, incluindo testes de unidade, integração,
  sistema e aceitação.

## Classes de domínio
| Classe | O que representa |
|---|---|
| **Cliente** | Instituição que compra da cooperativa (CNPJ, responsável, contato) |
| **Fornecedor** | Cooperado/produtor que vende para a cooperativa (CPF, área de atuação, tipo de associado) |
| **Produto** | Item comercializado (código único, categoria, preço, unidade) |
| **Estoque** | Quantidade disponível de um produto |
| **Aquisicao** | Compra de um produto de um fornecedor (quantidade, preço unitário, desconto, data) |
| **Pedido** | Venda para um cliente (código, status, desconto, total) |
| **ItemPedido** | Produto e quantidade dentro de um pedido, com o preço da época |

Relações: Cliente 1→N Pedido · Pedido 1→N ItemPedido · Produto 1→N ItemPedido ·
Fornecedor 1→N Aquisicao · Produto 1→N Aquisicao · Estoque 1→N Produto.

## Fluxo do negócio
```
Fornecedor ──(Aquisição)──▶ Estoque do Produto ──(Pedido / ItemPedido)──▶ Cliente
               soma ao estoque                      baixa do estoque
```

1. **Cadastro**: clientes, fornecedores e produtos são cadastrados.
2. **Compra (Aquisição)**: registra a compra de um produto de um fornecedor e **soma** a quantidade ao
   estoque do produto; se o produto ainda não tem estoque, ele é criado. O histórico de aquisições de
   cada produto é preservado.
3. **Venda (Pedido)**: o carrinho vira itens do pedido e cada item **dá baixa** no estoque.
   - O pedido é **recusado por inteiro** se algum produto não tiver estoque suficiente.
   - O total é calculado no servidor: soma dos itens pelo preço cadastrado, menos o desconto.
   - Editar o pedido devolve o estoque dos itens antigos e aplica os novos.
   - Excluir o pedido devolve todo o estoque.
4. **Consulta**: listagens com busca, filtro e paginação para cada classe.

## Onde está cada coisa
| Assunto | Local |
|---|---|
| Modelo de dados | `prisma/schema.prisma` e `prisma/migrations/` |
| Regras de pedido e estoque | `lib/pedidos.ts` |
| Validação de entrada e erros HTTP | `lib/api.ts` |
| Campos aceitos por classe | `lib/fields.ts` |
| API REST | `app/api/<entidade>/route.ts` e `app/api/<entidade>/[id]/route.ts` |
| Telas | `app/<entidade>/` (listagem, `new/`, `manage/[id]/`) |
| Testes de unidade | `lib/<classe>.test.ts` (skill `/teste-unitario`) |
| Teste de sistema | `tests/sistema/sistema.mjs` |

Entidades na API: `customers` (Cliente), `suppliers` (Fornecedor), `products` (Produto),
`stock` (Estoque), `acquisitions` (Aquisicao), `orders` (Pedido e ItemPedido).

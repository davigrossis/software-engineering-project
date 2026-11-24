# Testes de aceitação

## O que é teste de aceitação

O teste de aceitação verifica se o sistema atende ao que o negócio precisa. Ele parte de **histórias de usuário**
("Como [papel], quero [ação], para [benefício]") e de **critérios de aceite** escritos em linguagem de negócio, no
formato **Dado / Quando / Então**. Um critério está atendido quando o comportamento descrito acontece.

Neste projeto não há um conjunto separado de testes de aceitação: cada critério abaixo é verificado
automaticamente por testes que já existem:

- **Sistema** — `tests/sistema/sistema.mjs`: servidor rodando + API + banco, via HTTP. Roda com
  `node tests/sistema/sistema.mjs` e exige o app no ar (não faz parte do CI).
- **Integração** — `tests/integracao/<classe>.test.ts`: rotas da API + Prisma + PostgreSQL de teste. Roda com
  `npm run test:integracao` e também no CI, em todo pull request.

A [matriz de rastreabilidade](#matriz-de-rastreabilidade) liga cada critério ao teste que o verifica.

## Histórias de usuário e critérios de aceite

### Cadastros

#### H1 — Clientes
Como **cooperativa**, quero **cadastrar as instituições compradoras**, para **poder vender a elas**.

- **C1.1** — Dado os dados completos de uma instituição, quando ela é cadastrada, então o cliente fica gravado
  (informações que não fazem parte do cadastro são ignoradas).
- **C1.2** — Dado um cadastro sem os dados obrigatórios, quando ele é enviado, então o cadastro é recusado.
- **C1.3** — Dado um cliente já cadastrado, quando outro cliente é cadastrado com o mesmo CNPJ, então o cadastro é
  recusado e o cliente original continua igual.
- **C1.4** — Dado um cliente cadastrado, quando seus dados são alterados, então os novos dados ficam gravados e os
  demais continuam iguais.
- **C1.5** — Dado um cliente cadastrado, quando ele é removido, então deixa de existir.
- **C1.6** — Dado vários clientes cadastrados, quando a lista é consultada, então eles aparecem do mais novo ao
  mais antigo.
- **C1.7** — Dado um cliente que não existe (ou uma identificação inválida), quando ele é consultado, então o
  sistema informa o erro.

#### H2 — Fornecedores (cooperados)
Como **cooperativa**, quero **cadastrar os cooperados**, para **registrar de quem compro a produção**.

- **C2.1** — Dado nome e telefone de um produtor, quando ele é cadastrado, então fica gravado como "Cooperado".
- **C2.2** — Dado um fornecedor cadastrado, quando seus dados são alterados, então os novos dados ficam gravados.
- **C2.3** — Dado um fornecedor que não existe, quando se tenta alterá-lo, então a alteração é recusada.
- **C2.4** — Dado um fornecedor sem compras registradas, quando ele é removido, então deixa de existir.
- **C2.5** — Dado um fornecedor com compras registradas, quando se tenta removê-lo, então a remoção é recusada e
  ele e suas compras continuam gravados.

#### H3 — Produtos
Como **cooperativa**, quero **cadastrar os produtos comercializados**, para **comprá-los, estocá-los e vendê-los**.

- **C3.1** — Dado os dados de um produto, quando ele é cadastrado, então fica gravado.
- **C3.2** — Dado um produto já cadastrado, quando outro é cadastrado com o mesmo código, então o cadastro é
  recusado e nenhum produto novo é gravado.
- **C3.3** — Dado um produto cadastrado, quando se informa um preço que não é número, então a alteração é recusada.
- **C3.4** — Dado um produto com estoque, quando nome, categoria ou preço são alterados, então o estoque passa a
  mostrar os mesmos dados, sem mudar a quantidade.
- **C3.5** — Dado um produto que aparece em um pedido, quando se tenta excluí-lo, então a exclusão é recusada e o
  produto e o pedido continuam gravados.
- **C3.6** — Dado um produto sem pedidos e com compras registradas, quando ele é excluído, então o produto deixa
  de existir e as compras continuam no histórico, sem produto vinculado.

### Compras e estoque

#### H4 — Aquisições
Como **cooperativa**, quero **registrar cada compra feita de um cooperado**, para **que o estoque reflita o que
recebi**.

- **C4.1** — Dado um produto com estoque, quando uma compra é registrada, então a quantidade comprada é somada ao
  estoque.
- **C4.2** — Dado um produto ainda sem estoque, quando a primeira compra é registrada, então o estoque é criado
  com a quantidade comprada e com nome, categoria e preço do produto.
- **C4.3** — Dado um fornecedor que não existe, quando se registra uma compra dele, então a compra é recusada e
  nada é gravado.
- **C4.4** — Dado um produto que não existe, quando se registra uma compra dele, então a compra é recusada e nada
  é gravado.
- **C4.5** — Dado um produto com uma compra, quando outra compra é registrada, então as duas continuam no
  histórico do produto.
- **C4.6** — Dado uma compra com preço, quantidade e desconto, quando as compras são consultadas, então o valor
  total é preço × quantidade − desconto.
- **C4.7** — Dado uma compra registrada, quando ela é editada, então o preço unitário informado é mantido.

#### H5 — Estoque manual
Como **cooperativa**, quero **abrir o estoque de um produto manualmente**, para **registrar quantidades que já
tenho**.

- **C5.1** — Dado um produto sem estoque, quando o estoque é criado com uma quantidade, então ele copia nome,
  categoria e preço do produto e fica vinculado a ele.
- **C5.2** — Dado um produto que já tem estoque, quando se tenta criar outro estoque para ele, então a criação é
  recusada e o estoque existente continua igual.
- **C5.3** — Dado um estoque, quando se informa uma quantidade negativa, então a alteração é recusada e a
  quantidade continua igual.

### Vendas

#### H6 — Pedidos
Como **cooperativa**, quero **registrar as vendas para as instituições**, para **dar baixa no estoque e saber o
valor de cada venda**.

- **C6.1** — Dado um produto com estoque suficiente, quando um pedido é registrado, então cada item é gravado com
  o preço do cadastro do produto e a quantidade sai do estoque.
- **C6.2** — Dado um pedido com desconto, quando ele é registrado, então o total é calculado pela cooperativa
  (soma dos itens pelo preço cadastrado, menos o desconto), ignorando qualquer total enviado.
- **C6.3** — Dado um pedido com o mesmo produto em mais de uma linha, quando ele é registrado, então as linhas
  viram um único item com a soma das quantidades.
- **C6.4** — Dado um pedido em que algum produto não tem estoque suficiente, quando ele é registrado, então o
  pedido inteiro é recusado: nada é gravado e o estoque de todos os produtos continua igual.
- **C6.5** — Dado um item com quantidade zero, quando o pedido é registrado, então o pedido é recusado.
- **C6.6** — Dado um pedido registrado, quando seus itens são trocados, então o estoque dos itens antigos é
  devolvido, o dos novos é baixado e o total é recalculado.
- **C6.7** — Dado um pedido registrado, quando só o status é alterado, então o estoque não muda.
- **C6.8** — Dado um pedido registrado, quando ele é excluído, então todo o estoque dos seus itens é devolvido.

### Requisito não funcional

#### H7 — Tempo de resposta
Como **cooperativa**, quero **que o sistema responda rápido**, para **não atrasar o trabalho do dia a dia**.

- **C7.1** — Dado o sistema em funcionamento, quando as operações de cadastro, compra, venda e consulta são
  executadas, então cada resposta chega em menos do que o limite configurado (`LIMITE_MS`, padrão 3000 ms).

## Matriz de rastreabilidade

Nome do teste: o texto do `it(...)` nos testes de integração ou do `check(...)` no teste de sistema, copiado do
código.

| Critério | Arquivo | Nome do teste |
| --- | --- | --- |
| C1.1 | `tests/integracao/cliente.test.ts` | deve gravar o cliente no banco ignorando campos não permitidos |
| C1.1 | `tests/sistema/sistema.mjs` | cria cliente (201) |
| C1.2 | `tests/sistema/sistema.mjs` | cliente sem campos obrigatórios -> 400 |
| C1.3 | `tests/integracao/cliente.test.ts` | deve recusar CNPJ duplicado com 409 e manter um único registro |
| C1.4 | `tests/integracao/cliente.test.ts` | deve atualizar os dados do cliente no banco |
| C1.5 | `tests/integracao/cliente.test.ts` | deve remover o cliente do banco |
| C1.6 | `tests/integracao/cliente.test.ts` | deve listar os clientes do mais novo ao mais antigo |
| C1.7 | `tests/sistema/sistema.mjs` | GET id inexistente -> 404 · GET id inválido -> 400 |
| C2.1 | `tests/integracao/fornecedor.test.ts` | deve gravar o fornecedor no banco |
| C2.1 | `tests/sistema/sistema.mjs` | cria fornecedor (201) |
| C2.2 | `tests/integracao/fornecedor.test.ts` | deve atualizar os dados do fornecedor no banco |
| C2.3 | `tests/sistema/sistema.mjs` | PUT id inexistente -> 404 |
| C2.4 | `tests/integracao/fornecedor.test.ts` | deve remover o fornecedor sem aquisições do banco |
| C2.5 | `tests/integracao/fornecedor.test.ts` | deve recusar com 409 a exclusão de fornecedor com aquisição e mantê-lo no banco |
| C3.1 | `tests/sistema/sistema.mjs` | cria produto (201) |
| C3.2 | `tests/integracao/produto.test.ts` | deve recusar código de produto duplicado com 409 sem gravar outro produto |
| C3.2 | `tests/sistema/sistema.mjs` | código de produto duplicado -> 409 |
| C3.3 | `tests/sistema/sistema.mjs` | preço não numérico -> 400 |
| C3.4 | `tests/integracao/produto.test.ts` | deve sincronizar nome, categoria e preço no estoque vinculado |
| C3.4 | `tests/sistema/sistema.mjs` | estoque sincronizado com o produto (nome/preço) |
| C3.5 | `tests/integracao/produto.test.ts` | deve recusar com 409 a exclusão de produto que está em pedido e mantê-lo no banco |
| C3.5 | `tests/sistema/sistema.mjs` | excluir produto que está em pedido -> 409 |
| C3.6 | `tests/integracao/produto.test.ts` | deve remover o produto sem pedido e deixar as aquisições com id_produto nulo |
| C3.6 | `tests/sistema/sistema.mjs` | exclui produto sem pedidos (200) · aquisição continua existindo, sem produto (SET NULL) |
| C4.1 | `tests/integracao/aquisicao.test.ts` | deve gravar a aquisição com o id_produto e somar a quantidade ao estoque existente |
| C4.1 | `tests/sistema/sistema.mjs` | estoque somado para 15 |
| C4.2 | `tests/integracao/aquisicao.test.ts` | deve criar o estoque e vincular ao produto quando ele ainda não tem estoque |
| C4.2 | `tests/sistema/sistema.mjs` | estoque criado com 10 · estoque copia nome/categoria/preço do produto |
| C4.3 | `tests/integracao/aquisicao.test.ts` | deve recusar fornecedor inexistente sem gravar a aquisição |
| C4.4 | `tests/integracao/aquisicao.test.ts` | deve recusar produto inexistente sem gravar a aquisição |
| C4.4 | `tests/sistema/sistema.mjs` | aquisição de produto inexistente -> 400 |
| C4.5 | `tests/sistema/sistema.mjs` | histórico preservado: as 2 aquisições apontam para o produto |
| C4.6 | `tests/integracao/aquisicao.test.ts` | deve listar as aquisições com o produto e o valor_total |
| C4.6 | `tests/sistema/sistema.mjs` | valor_total = preço × qtd − desconto |
| C4.7 | `tests/sistema/sistema.mjs` | PUT aquisição (200) mantém preço unitário |
| C5.1 | `tests/integracao/estoque.test.ts` | deve criar o estoque com os dados do produto e gravar o id_estoque no produto |
| C5.1 | `tests/sistema/sistema.mjs` | cria estoque a partir do produto (201) · estoque manual copia dados do produto |
| C5.2 | `tests/integracao/estoque.test.ts` | deve recusar um segundo estoque para o mesmo produto sem criar nada |
| C5.2 | `tests/sistema/sistema.mjs` | segundo estoque para o mesmo produto -> 400 |
| C5.3 | `tests/integracao/estoque.test.ts` | deve recusar quantidade negativa no PUT sem alterar o estoque |
| C5.3 | `tests/sistema/sistema.mjs` | estoque negativo -> 400 |
| C6.1 | `tests/integracao/pedido.test.ts` | deve gravar os itens com o preço do cadastro e dar baixa no estoque |
| C6.1 | `tests/sistema/sistema.mjs` | cria pedido com itens (201) · baixa no estoque: 15 → 11 |
| C6.2 | `tests/sistema/sistema.mjs` | total recalculado no servidor (4 × 8,50 − 4 = 30) |
| C6.3 | `tests/sistema/sistema.mjs` | itens repetidos do mesmo produto agrupados |
| C6.4 | `tests/integracao/pedido.test.ts` | deve recusar estoque insuficiente sem gravar pedido nem itens e sem mexer no estoque |
| C6.4 | `tests/sistema/sistema.mjs` | pedido acima do estoque -> 400 · estoque intacto após pedido recusado (11) · pedido recusado não foi gravado (rollback) |
| C6.5 | `tests/sistema/sistema.mjs` | item com quantidade 0 -> 400 |
| C6.6 | `tests/integracao/pedido.test.ts` | deve trocar os itens no PUT e reajustar o estoque |
| C6.6 | `tests/sistema/sistema.mjs` | estoque ajustado na edição: devolve 4, baixa 6 → 9 · total recalculado na edição (6 × 8,50 = 51) |
| C6.7 | `tests/sistema/sistema.mjs` | PUT sem itens não mexe no estoque (9) |
| C6.8 | `tests/integracao/pedido.test.ts` | deve devolver o estoque e apagar os itens no DELETE |
| C6.8 | `tests/sistema/sistema.mjs` | estoque devolvido ao excluir pedido: 9 → 15 |
| C7.1 | `tests/sistema/sistema.mjs` | todas as requisições abaixo de `${LIMITE_MS}` ms |

### Não automatizado

| Requisito | Situação |
| --- | --- |
| Busca, filtro e paginação nas listagens (`docs/contexto.md`, fluxo do negócio, item 4) | **não automatizado** — existe nas telas (ex.: `components/table/index.tsx`), mas nenhum teste o verifica |

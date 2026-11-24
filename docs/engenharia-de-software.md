# Engenharia de Software no projeto COOPAF

Como o projeto aplica os dois temas do grupo na disciplina DCC061 (Engenharia de Software):
**Testes de Software** e **Gerência de Configuração e Manutenção**. Tudo o que está aqui pode ser conferido
no repositório.

## 1. Testes de Software

### Pirâmide de testes

| Nível | Onde | O que testa | O que garante |
| --- | --- | --- | --- |
| Unidade | `lib/<classe>.test.ts` (7 arquivos) | uma função isolada, sem banco e sem rede | a validação de entrada (`pickFields`/`requireFields` de `lib/api.ts`) aceita, converte e recusa os campos de cada entidade (`lib/fields.ts`) |
| Integração | `tests/integracao/<classe>.test.ts` (6 arquivos) | rota da API + regras de `lib/` + Prisma + PostgreSQL de teste, sem servidor HTTP | as rotas gravam, leem e alteram o banco corretamente, inclusive as transações |
| Sistema | `tests/sistema/sistema.mjs` | servidor rodando + API + banco, via HTTP | o sistema completo atende os requisitos funcionais e o tempo de resposta (requisito não funcional, `LIMITE_MS`) |

A base tem mais testes porque eles são rápidos e apontam exatamente onde está o erro. Subindo a pirâmide, os
testes ficam mais lentos, mas cobrem a comunicação entre as partes, que a unidade não alcança.

Os **testes de aceitação** (histórias de usuário com critérios Dado / Quando / Então) estão em
[`aceitacao.md`](aceitacao.md): cada critério é verificado pelos testes de sistema e de integração, ligados por uma
matriz de rastreabilidade.

Comandos: `npm test` (unidade), `npm run test:integracao` (integração) e `node tests/sistema/sistema.mjs`
(sistema, com o app rodando).

### Padrão AAA

Todo teste é dividido em **Arrange** (preparar), **Act** (executar) e **Assert** (verificar). Exemplo real de
`lib/pedido.test.ts`:

```ts
it('deve recusar id_cliente não numérico', () => {
  // Arrange
  const corpo = { id_cliente: 'abc' };

  // Act
  const executar = () => pickFields(corpo, PEDIDO_FIELDS);

  // Assert
  expect(executar).toThrow(ValidationError);
  expect(executar).toThrow('Campo "id_cliente" deve ser numérico');
});
```

### Exemplos reais de integração (`tests/integracao/pedido.test.ts`)

- **Rollback com estoque insuficiente:** um pedido com dois produtos, em que o segundo não tem estoque
  suficiente, é recusado com `400`. O teste confirma que nenhum pedido ou item foi gravado e que o estoque do
  primeiro produto voltou a 10: a baixa feita antes do erro foi desfeita, porque a rota
  (`app/api/orders/route.ts`) roda tudo dentro de um `prisma.$transaction`.
- **Baixa de estoque:** ao criar um pedido, o item é gravado com o preço do cadastro do produto, o total é
  calculado no servidor e a quantidade sai do estoque.
- **Devolução no DELETE:** ao excluir um pedido, os itens são apagados e o estoque é devolvido.

### Isolamento e confiabilidade

- Os testes de integração usam **somente** o banco do `.env.test`. A configuração
  (`vitest.integracao.config.mts`) se recusa a rodar se ele não existir ou for o mesmo banco do `.env`.
- Antes de cada teste, `tests/integracao/setup.ts` limpa todas as tabelas (`TRUNCATE`): cada teste começa do
  zero e não depende da ordem dos outros.
- O estado inicial (Arrange) é montado direto com o Prisma, sem depender de outras rotas.
- Regra do `AGENTS.md`: nunca pular, desabilitar ou apagar um teste que falha para deixar a execução verde.

## 2. Gerência de Configuração e Manutenção

### Fluxo de trabalho no GitHub

- **Issues:** cada tarefa vira uma issue (ex.: #1 a #9, testes de unidade e de integração por classe).
- **Uma branch por tarefa:** ex.: `7-testes-unitários-cliente`, `test/integracao-cadastros`,
  `ci/github-actions`.
- **Pull requests:** as branches são integradas na `main` via pull request e merge, com revisão do dono do
  repositório. O texto `Closes #N` no PR fecha a issue automaticamente ao integrar (ex.: PRs #16, #18 e #19).
- **Commits padronizados**, em português, com o tipo da mudança: `feat:`, `test:`, `build:`, `docs:`, `ci:`.
  Ex.: `test: adiciona testes de integração das movimentações (#9)`, `build: configura os testes de integração`.

### Itens de configuração versionados

- **Banco de dados:** o schema (`prisma/schema.prisma`) evolui por **migrations versionadas** em
  `prisma/migrations/` (8 até agora, nomeadas por data). Uma migration existente nunca é editada: toda mudança
  vira uma migration nova, aplicada com `npx prisma migrate deploy`.
- **Dependências:** `package-lock.json` fixa as versões; o CI instala com `npm ci` para builds reproduzíveis.
- **Instruções para IA:** `AGENTS.md` (fonte única), `CLAUDE.md` e as skills `/teste-unitario` e
  `/teste-integracao` ficam no git. As regras proibidas protegem as regras de negócio contra mudanças não pedidas.
- **Ambiente:** `.env` e `.env.test` ficam fora do git (`.gitignore`); o `.env.example` serve de modelo. O banco
  de teste é separado do banco de desenvolvimento.

### Integração contínua (GitHub Actions)

O workflow `.github/workflows/ci.yml` (PR #20) roda em todo pull request e em todo push na `main`, com um
PostgreSQL descartável. Ele executa automaticamente a mesma checagem da definição de pronto: lint, checagem de
tipos, testes de unidade, migrations + testes de integração e build. Assim, um problema aparece no próprio PR,
antes de chegar à `main`.

### Manutenção

Os testes servem de rede de segurança: ao corrigir ou evoluir o código, uma regra quebrada aparece em
`npm test`, `npm run test:integracao` ou no CI. Junto com issues, branches, PRs e migrations, cada mudança fica
rastreável — o que mudou, por quê e quando.

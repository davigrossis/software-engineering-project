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

- **Issues:** cada tarefa vira uma issue (de #1 a #41, numeradas junto com os PRs; ex.: #1 a #9, testes de
  unidade e de integração por classe).
- **Uma branch por tarefa:** ex.: `7-testes-unitários-cliente`, `test/integracao-cadastros`,
  `ci/github-actions`.
- **Pull requests:** as branches são integradas na `main` via pull request e merge, com revisão do dono do
  repositório. O texto `Closes #N` no PR fecha a issue automaticamente ao integrar (ex.: PRs #16, #18 e #19).
- **Commits padronizados (Conventional Commits)**, em português, com o tipo da mudança: `feat:`, `fix:`,
  `test:`, `build:`, `docs:`, `ci:`, `refactor:`. Ex.: `test: adiciona testes de integração das movimentações (#9)`,
  `fix: trata as promises e o reduce apontados pelo SonarCloud (#26)`. O padrão é **validado automaticamente**
  pelo **Commitlint** (`commitlint.config.mjs` + workflow `.github/workflows/commitlint.yml`, PR #28): um PR
  com um commit fora do padrão (ex.: `Corrigi umas coisas`) falha no check.
- **`main` protegida (ruleset `protect-main`):** só recebe mudanças por pull request (merge commit), com os 2
  checks obrigatórios verdes: **"Lint, tipos, testes e build"** e **"Mensagens de commit (Conventional
  Commits)"**. Push direto, push forçado e exclusão da branch são bloqueados.
  Assim, nenhuma modificação entra na linha de base sem passar pelo controle.

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
antes de chegar à `main`. Como o check é obrigatório no ruleset, um PR com o CI vermelho não pode ser integrado.

### Cobertura de testes

Os testes rodam no CI com cobertura (`@vitest/coverage-v8`, PR #29), medindo **cobertura de comandos e de
branches** de `lib/` e `app/api/`. O resumo aparece na página de cada execução do CI e o relatório completo
(`lcov` e HTML) fica salvo como artefato `cobertura`. Localmente: `npm run test:cobertura` e
`npm run test:integracao:cobertura`.

| Suíte | Comandos | Branches | Funções | Linhas |
| --- | --- | --- | --- | --- |
| Unidade | 20,5% | 43,5% | 18,4% | 18,2% |
| Integração | 64,1% | 62,1% | 71,4% | 66,2% |

_Medição do CI do PR #29._ A unidade cobre só a validação em `lib/` (as rotas aparecem com 0%). A integração
chega às rotas de `app/api/` e às transações, o que mostra na prática a diferença de alcance entre os níveis da
pirâmide.

### Análise estática (SonarCloud)

O repositório está conectado ao **SonarCloud**, que analisa cada PR e a `main` e coleta **métricas estáticas**:
bugs, vulnerabilidades, *code smells* (manutenibilidade), duplicação e complexidade. Na primeira análise da
`main` foram encontrados:

| Métrica | Valor |
| --- | --- |
| Bugs | 18 |
| Vulnerabilidades | 8 (a maioria falsos positivos em código de teste/CI) |
| *Code smells* | 72 (67 de acessibilidade: `<label>` sem campo associado) |
| Duplicação | 12,6% (formulários de cadastro e edição repetidos) |
| Linhas de código | 5.602 |

Na análise atual da `main`, depois da manutenção corretiva (ver [Manutenção](#manutenção)):

| Métrica | Valor |
| --- | --- |
| Bugs | 0 |
| Vulnerabilidades | 5 |
| *Code smells* | 72 |
| Duplicação | 16,8% |
| *Quality gate* | reprovado só pela cobertura do código novo, porque a interface não tem testes |

O `sonar-project.properties` e o job **"SonarCloud (análise estática e cobertura)"** do CI (PR #30) permitem
enviar também a cobertura ao Sonar, quando o secret `SONAR_TOKEN` está configurado.

### Revisão de código (CodeRabbit)

Cada PR é revisado automaticamente pelo **CodeRabbit**, configurado em `.coderabbit.yaml` (PR #36):

- A revisão é feita em **pt-BR** e segue as regras do `AGENTS.md`, com orientações por caminho: aponta mudanças
  em arquivos de regra de negócio, edição de migrations existentes, testes pulados ou fora do padrão AAA e uso
  de `any`.
- O **resumo do PR é gerado automaticamente**: o template (`.github/pull_request_template.md`) traz o marcador
  `@coderabbitai summary`, que o CodeRabbit substitui pelo resumo do que mudou e por quê, dizendo se o PR
  altera regras de negócio.

### Entrega contínua (Vercel)

O projeto está conectado à **Vercel**, que completa o CI com a entrega contínua (CD):

- **Preview em cada PR:** cada pull request ganha um deploy de *Preview*, e o bot da Vercel comenta no PR o
  link para testar a versão.
- **Produção automática:** cada integração na `main` é publicada automaticamente em produção, em
  <https://software-engineering-project-theta.vercel.app>.
- **CI/CD encadeado:** como o ruleset `protect-main` só deixa integrar na `main` com os checks obrigatórios
  verdes, só chega à produção o código que já passou pelo CI.
- **Limitação:** o *Preview* e a produção usam o mesmo banco de dados, então testes feitos num *Preview*
  alteram os dados de produção.

### Demonstração

Dois PRs foram abertos **de propósito** para mostrar os controles barrando mudanças fora do padrão (não devem
ser integrados):

- **PR #33 — barrado pelo Commitlint:** o commit `Corrigi umas coisas no README` não segue o Conventional
  Commits; o check "Mensagens de commit (Conventional Commits)" falha e o ruleset bloqueia o merge.
- **PR #34 — barrado pelo CI:** adiciona um teste com expectativa errada; o commit segue o padrão, mas o check
  "Lint, tipos, testes e build" falha nos testes de unidade e o ruleset bloqueia o merge.

### Manutenção

Os testes servem de rede de segurança: ao corrigir ou evoluir o código, uma regra quebrada aparece em
`npm test`, `npm run test:integracao` ou no CI. Junto com issues, branches, PRs e migrations, cada mudança fica
rastreável — o que mudou, por quê e quando.

- **Manutenção corretiva (issue #26, PR #31):** a partir dos bugs apontados pelo SonarCloud, foram corrigidas
  17 promises não tratadas nas páginas de `app/` (`void` nas chamadas a funções `async` que já tratam o erro) e
  um `reduce()` sem valor inicial no teste de sistema, que lançaria erro com uma lista vazia. O CI garantiu que
  nada regrediu, a análise do Sonar no PR não apontou nenhum problema novo, e os bugs corrigidos saem do painel
  na análise da `main` feita depois do merge.
- **Débito técnico registrado:** a duplicação dos formulários e os alertas de acessibilidade ficam como
  candidatos a **manutenção perfectiva / refatoração**, a ser feita com a mesma rede de testes.

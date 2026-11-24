// Gerência de configuração: mensagens de commit no padrão Conventional Commits.
// Formato: <tipo>: <descrição em português>  (ex.: "fix: trata erro ao carregar produtos")
// Tipos aceitos: feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert.
// Validado em todo pull request pelo workflow .github/workflows/commitlint.yml.
const config = {
  extends: ['@commitlint/config-conventional'],
};

export default config;

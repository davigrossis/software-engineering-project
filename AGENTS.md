# Instruções para agentes de IA (AGENTS.md)

Este arquivo é a **fonte única** de instruções para qualquer assistente de IA que trabalhe neste repositório
(Claude Code, ChatGPT/Codex, Copilot etc.). O `CLAUDE.md` apenas importa este arquivo.

Sistema de gestão da **COOPAF** (cooperativa da agricultura familiar): cadastros, compras de cooperados,
estoque e vendas para instituições. **Contexto completo** — propósito, objetivo, classes e fluxo do negócio:
[`docs/contexto.md`](docs/contexto.md). Leia antes de qualquer tarefa que envolva regras de negócio.

## 🚫 Regras proibidas (sem exceção)

1. **É expressamente proibido alterar regras de negócio.** Isso inclui o comportamento de:
   - `lib/pedidos.ts` (itens do pedido, baixa e devolução de estoque, cálculo do total);
   - `lib/api.ts` e `lib/fields.ts` (validação de entrada, campos aceitos, códigos HTTP);
   - a lógica das rotas em `app/api/**` (ex.: aquisição somando ao estoque);
   - `prisma/schema.prisma` (entidades, campos, relações).

   Se uma tarefa parecer exigir mudança de regra de negócio, **pare e pergunte ao dono do repositório
   (@davigrossis)**, explicando qual regra e por quê. Só altere com pedido explícito dele.
2. **Não altere `AGENTS.md`, `CLAUDE.md` nem `docs/contexto.md` sem motivo válido**: pedido explícito do dono
   ou mudança real no projeto que deixou o arquivo desatualizado. Sugestões vão em issue ou comentário.
3. **Nunca edite uma migration existente** em `prisma/migrations/`. Mudança de schema só com pedido
   explícito (regra 1) e sempre por uma migration nova.
4. **Nunca trabalhe direto na `main`.** Toda tarefa tem uma issue: trabalhe **na branch da issue**,
   criada a partir dela (no GitHub, em _Development › Create a branch_, ou `gh issue develop <número> --checkout`).
   Faça os commits nessa branch e só depois integre na `main` com merge. Se a tarefa não tiver issue,
   peça ao dono do repositório para criar uma antes de começar.
5. **Nunca exponha credenciais**: não exiba o conteúdo do `.env` nem o commite. Use o `.env.example`
   como modelo. Os backups do banco (`backups/`) também nunca vão para o git.
6. **Nunca pule, desabilite ou apague um teste que falha** para deixar a execução verde. Corrija o teste
   ou reporte o bug encontrado no código.
7. **Não altere `package.json`, `package-lock.json`, `tsconfig.json` nem `vitest.config.mts`**, nem adicione
   ou atualize dependências, sem pedido explícito.

## Regras gerais
- Faça mudanças pequenas e focadas no que foi pedido; não reformate nem refatore arquivos sem relação.
- Antes de uma tarefa maior, apresente o plano em passos e confirme.
- TypeScript estrito: não use `any`; em `catch`, use `unknown` com `errorMessage()` de `lib/errors.ts`.
- Rotas novas devem usar `pickFields`/`requireFields`/`handleError` (`lib/api.ts`) e um schema em `lib/fields.ts`;
  nunca repasse o corpo da requisição direto para o Prisma.
- Textos da interface, mensagens de erro e commits em **português**.
- Rode testes de sistema apenas contra banco de desenvolvimento/teste, nunca de produção.

## Stack
Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Prisma 7 + PostgreSQL (`@prisma/adapter-pg`) ·
Vitest 5.

## Comandos
| Ação | Comando |
|---|---|
| Instalar dependências | `npm install` |
| Aplicar migrations | `npx prisma migrate deploy` |
| Servidor de desenvolvimento | `npm run dev` (não termina sozinho: rode em segundo plano) |
| Lint | `npm run lint` |
| Checagem de tipos | `npx tsc --noEmit` |
| Testes de unidade | `npm test` (ou `npx vitest run lib/<arquivo>.test.ts`) |
| Teste de sistema | `node tests/sistema/sistema.mjs` (exige o app rodando e um banco de teste) |
| Build | `npm run build` |

## Testes
- **Unidade:** um arquivo por classe em `lib/<classe>.test.ts`, padrão **AAA** (`// Arrange`, `// Act`,
  `// Assert`), sem banco e sem rede. Siga a skill [`.claude/skills/teste-unitario/SKILL.md`](.claude/skills/teste-unitario/SKILL.md).
- **Sistema:** `tests/sistema/sistema.mjs` testa servidor + API + banco e o tempo de resposta.

## Definição de pronto
Antes de dar uma tarefa como concluída, rode e confira que passam:
`npm run lint` · `npx tsc --noEmit` · `npm test` · `npm run build`.
Reporte o resultado real de cada comando; se algo falhar ou não puder ser rodado, diga.

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
    // Cobertura de comandos e branches: só com --coverage (npm run test:integracao:cobertura)
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage/integracao',
    },
  },
});

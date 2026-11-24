import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    // Mesmo alias "@/..." do tsconfig.json
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    // describe/it/expect/vi disponíveis sem import (como no Jest)
    globals: true,
    // Testes de unidade das regras em lib/: não precisam de navegador
    environment: 'node',
    include: ['lib/**/*.test.ts'],
    // Não falha enquanto o time ainda não escreveu os testes
    passWithNoTests: true,
    // Cobertura de comandos e branches: só com --coverage (npm run test:cobertura)
    coverage: {
      provider: 'v8',
      include: ['lib/**/*.ts', 'app/api/**/*.ts'],
      exclude: ['**/*.test.ts'],
      reporter: ['text', 'lcov', 'json-summary'],
      reportsDirectory: 'coverage/unidade',
    },
  },
});

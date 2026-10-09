import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./test/setup.ts'],
    include: ['test/**/*.test.ts'],
    pool: 'forks',
    // Windows + better-sqlite3: forks simultâneos deixam os testes lentos
    // e estouram o timeout de conexão. Limite de 2 mantém tudo estável.
    maxWorkers: 2,
    testTimeout: 20000,
  },
});

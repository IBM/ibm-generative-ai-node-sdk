import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: [
      'dotenv-flow/config',
      'jest-extended/all',
      './src/tests/setup.ts',
    ],
    singleThread: true,
    bail: 1,
    coverage: {
      exclude: ['**/__mocks__/**'],
    },
  },
});

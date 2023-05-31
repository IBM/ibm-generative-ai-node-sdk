import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: [
      'dotenv-flow/config',
      'jest-extended/all',
      './src/tests/setup.ts',
    ],
    coverage: {
      exclude: ['**/__mocks__/**'],
    },
  },
});

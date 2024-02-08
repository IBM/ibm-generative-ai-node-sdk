import { defineConfig, defaultExclude } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    setupFiles: ['dotenv-flow/config', 'jest-extended/all', './tests/setup.ts'],
    coverage: {
      exclude: ['**/__mocks__/**'],
    },
    exclude: [...defaultExclude],
  },
});

import { defineConfig, defaultExclude } from 'vitest/config';
import { compareVersions } from 'compare-versions';

const ignoreLangChain = compareVersions(process.version, '18.16.0') === -1;

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
    exclude: [
      ...defaultExclude,
      ...(ignoreLangChain ? ['**/langchain/**'] : []),
    ],
  },
});

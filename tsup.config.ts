import { defineConfig } from 'tsup';
import dotenv from 'dotenv-flow';
import pkgInfo from './package.json' assert { type: 'json' };

dotenv.config();

const GENAI_DEFAULT_ENDPOINT = process.env.GENAI_DEFAULT_ENDPOINT;
if (!GENAI_DEFAULT_ENDPOINT)
  throw new Error('Missing GENAI_DEFAULT_ENDPOINT env variable');

export default defineConfig({
  entry: ['src/index.ts', 'src/langchain/index.ts'],
  tsconfig: 'tsconfig.build.json',
  clean: true,
  dts: true,
  format: ['esm', 'cjs'],
  platform: 'node',
  shims: true,
  env: {
    NODE_ENV: 'production',
    GENAI_DEFAULT_ENDPOINT: GENAI_DEFAULT_ENDPOINT,
    VERSION: pkgInfo.version,
  },
});

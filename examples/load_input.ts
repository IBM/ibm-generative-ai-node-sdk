import { readFileSync } from 'fs';
import { GenerateInputSchema } from '../src/index.js';

export const loadGenerateInput = () =>
  // Input files usually follow JSONL format
  readFileSync('examples/assets/generate_input.jsonl', 'utf8')
    .split('\n')
    .map((line) => JSON.stringify(line))
    .map((input) =>
      GenerateInputSchema.parse({
        model_id: 'default',
        input,
      }),
    );

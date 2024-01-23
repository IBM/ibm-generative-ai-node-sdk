import { readFileSync } from 'fs';

export const loadGenerateInput = () =>
  // Input files usually follow JSONL format
  readFileSync('examples/assets/generate_input.jsonl', 'utf8')
    .split('\n')
    .map((line) => JSON.stringify(line))
    .map((input) => ({
      model_id: 'google/flan-ul2',
      input,
    }));

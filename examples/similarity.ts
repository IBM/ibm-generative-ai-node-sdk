import { Client } from '../src/index.js';

import { EMBEDDING_MODEL } from './shared/constants.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

{
  const output = await client.text.experimental.sentenceSimilarity.create({
    model_id: EMBEDDING_MODEL,
    source_sentence: 'Good morning',
    sentences: ['How are you?', 'Get lost!'],
  });
  console.log(output);
}

import { Client } from '../src/index.js';

import { MODEL } from './constants.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

const input = { model_id: MODEL, input: 'How are you?' };

{
  const output = await client.text.generation.create(input);
  console.log(output);
}

{
  // Streaming (async iterators)
  const stream = await client.text.generation.create_stream(input);
  for await (const chunk of stream) {
    const result = chunk.results?.at(0);
    if (result) {
      console.log(result.stop_reason);
      console.log(result.generated_token_count);
      console.log(result.input_token_count);
      console.log(result.generated_text);
    }
  }
}

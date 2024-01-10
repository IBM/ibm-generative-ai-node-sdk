import { Client } from '../src/index.js';

import { loadGenerateInput } from './load_input.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

const multipleInputs = loadGenerateInput();
const singleInput = multipleInputs[0];

{
  // Streaming (async iterators)
  const stream = client.generate(singleInput, {
    stream: true,
  });
  for await (const chunk of stream) {
    console.log(chunk.stop_reason);
    console.log(chunk.generated_token_count);
    console.log(chunk.input_token_count);
    console.log(chunk.generated_text);
  }
}

{
  // Streaming (built-in stream methods)
  const stream = client.generate(singleInput, {
    stream: true,
  });
  stream.on('data', (chunk) => {
    console.log(chunk.stop_reason);
    console.log(chunk.generated_token_count);
    console.log(chunk.input_token_count);
    console.log(chunk.generated_text);
  });
  stream.on('error', (err) => {
    console.error('error has occurred', err);
  });
  stream.on('close', () => {
    console.info('end of stream');
  });
}

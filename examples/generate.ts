import { Client } from '../src/index.js';
import { loadGenerateInput } from './load_input.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

const multipleInputs = loadGenerateInput();
const singleInput = multipleInputs[0];

{
  // Use with a single input to get a promise
  const output = await client.generate(singleInput);
  console.log(output);
}

{
  // Or supply a callback
  client.generate(singleInput, (err, output) => {
    if (err) console.error(err);
    else console.log(output);
  });
}

{
  // Use with multiple inputs to get a promise
  const outputs = await Promise.all(client.generate(multipleInputs));
  console.log(outputs);

  // Or supply a callback which will be called for each output
  // Callback is guaranteed to be called in the order of respective inputs
  client.generate(multipleInputs, (err, output) => {
    if (err) console.error(err);
    else console.log(output);
  });

  // The method is optimized for sequential await, order the inputs accordingly
  for (const outputPromise of client.generate(multipleInputs)) {
    try {
      console.log(await outputPromise);
    } catch (err) {
      console.error(err);
    }
  }
}

{
  // Streaming (callback style)
  client.generate(
    singleInput,
    {
      stream: true,
    },
    (err, output) => {
      if (err) {
        console.error(err);
      } else if (output === null) {
        // END of stream
      } else {
        console.log(output.stop_reason);
        console.log(output.generated_token_count);
        console.log(output.input_token_count);
        console.log(output.generated_text);
      }
    },
  );
}

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

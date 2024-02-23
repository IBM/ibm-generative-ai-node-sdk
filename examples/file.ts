import { createReadStream } from 'node:fs';
import { blob } from 'node:stream/consumers';

import { Client } from '../src/index.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

{
  // List all files
  let totalCount = Infinity;
  const limit = 100;
  for (let offset = 0; offset < totalCount; offset += limit) {
    const { results, total_count } = await client.file.list({
      limit,
      offset,
    });
    for (const file of results) {
      console.log(file);
    }
    totalCount = total_count;
  }
}

{
  // Upload a file
  const { result } = await client.file.create({
    purpose: 'tune',
    file: {
      name: 'tune_input.jsonl',
      content: (await blob(
        createReadStream('examples/assets/tune_input.jsonl'),
      )) as any,
    },
  });
  console.log(result);

  // Show details of a file
  const file = await client.file.retrieve({ id: result.id });
  console.log(file);

  // Download the file's content
  const content = await client.file.read({ id: result.id });
  console.log(await content.text());

  // Delete the file
  await client.file.delete({ id: result.id });
}

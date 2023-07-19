import { createReadStream, createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';

import { Client } from '../src/index.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

{
  // List all files
  for await (const file of client.files()) {
    console.log(file);
  }
}

{
  // List all files via callback interface
  client.files((err, file) => {
    if (err) console.error(err);
    console.log(file);
  });
}

{
  // Upload a file
  const newFile = await client.file({
    purpose: 'tune',
    filename: 'tune_input.jsonl',
    file: createReadStream('examples/assets/tune_input.jsonl'),
  });
  console.log(newFile);

  // Show details of a file
  const file = await client.file({ id: newFile.id });
  console.log(file);

  // Download the file's content
  const content = await file.download();
  await pipeline(content, createWriteStream('/dev/null'));

  // Delete the file
  await client.file({ id: file.id }, { delete: true });
}

import { createReadStream, createWriteStream } from 'node:fs';
import { Client } from '../src/index.js';
import { pipeline } from 'node:stream';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

{
  // List all files
  for await (const tune of client.files()) {
    console.log(tune);
  }
}

{
  // List all files via callback interface
  client.files((err, tune) => {
    if (err) console.error(err);
    console.log(tune);
  });
}

{
  // Upload a file
  const newFile = await client.file({
    purpose: 'tune',
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

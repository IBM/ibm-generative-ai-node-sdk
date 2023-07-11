import { createWriteStream } from 'node:fs';
import { Client } from '../src/index.js';
import { pipeline } from 'node:stream';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

{
  // List all completed tunes
  for await (const tune of client.tunes({ filters: { status: 'COMPLETED' } })) {
    console.log(tune);
  }
}

{
  // List all completed tunes via callback interface
  client.tunes({ filters: { status: 'COMPLETED' } }, (err, tune) => {
    if (err) console.error(err);
    console.log(tune);
  });
}

{
  // List available tune methods
  const tuneMethods = await client.tuneMethods();
  console.log(tuneMethods);

  // Create a tune
  const newTune = await client.tune({
    name: 'Awesome Tune',
    method_id: tuneMethods[0].id,
    model_id: 'google/flan-t5-xl',
    task_id: 'generation',
    training_file_ids: ['fileId'],
  });
  console.log(newTune);

  // Show details of the tune
  const tune = await client.tune({ id: newTune.id });
  console.log(tune);

  // Download tune's assets when completed
  if (tune.status === 'COMPLETED') {
    const encoder = await tune.downloadAsset('encoder');
    const logs = await tune.downloadAsset('logs');
    await Promise.all([
      pipeline(encoder, createWriteStream('/dev/null')),
      pipeline(logs, createWriteStream('/dev/null')),
    ]);
  }

  // Delete the tune
  await client.tune({ id: tune.id }, { delete: true });
}

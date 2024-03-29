import { blob } from 'node:stream/consumers';
import { createReadStream } from 'node:fs';

import { Client } from '../src/index.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

{
  // List all completed tunes
  let totalCount = Infinity;
  const limit = 100;
  for (let offset = 0; offset < totalCount; offset += limit) {
    const { results, total_count } = await client.tune.list({
      limit,
      offset,
      status: 'completed',
    });
    for (const file of results) {
      console.log(file);
    }
    totalCount = total_count;
  }
}

{
  // List available tune methods
  const { results: tuneTypes } = await client.tune.types({});
  console.log(tuneTypes);

  // Upload file for tuning
  const { result: file } = await client.file.create({
    purpose: 'tune',
    file: {
      name: 'tune_input.jsonl',
      content: (await blob(
        createReadStream('examples/assets/tune_input.jsonl'),
      )) as any,
    },
  });

  // Create a tune
  const { result: createdTune } = await client.tune.create({
    name: 'Awesome Tune',
    tuning_type: 'prompt_tuning',
    model_id: 'google/flan-t5-xl',
    task_id: 'generation',
    training_file_ids: [file.id],
  });
  console.log(createdTune);

  // Show details of the tune
  const { result: retrievedTune } = await client.tune.retrieve({
    id: createdTune.id,
  });
  console.log(retrievedTune);

  // Download tune's assets when completed
  if (retrievedTune.status === 'completed') {
    const logs = await client.tune.read({ id: retrievedTune.id, type: 'logs' });
    console.log(await logs.text());
  }

  // Delete the tune
  await client.tune.delete({ id: createdTune.id });

  // Detele the file
  await client.file.delete({ id: file.id });
}

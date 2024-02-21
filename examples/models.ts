import { Client } from '../src/index.js';

import { MODEL } from './constants.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

{
  // List first hundred models
  const { results } = await client.model.list({ limit: 100, offset: 0 });
  console.log(results);
}

{
  // Retrieve info about a specific model
  const { result } = await client.model.retrieve({ id: MODEL });
  console.log(result);
}

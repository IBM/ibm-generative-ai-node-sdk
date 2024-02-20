import { Client } from '../src/index.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

const models = await client.models({ limit: 100, offset: 0 });
console.log(models);

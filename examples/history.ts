import { Client } from '../src/index.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

{
  // List historical success requests to the API
  for await (const request of client.history({
    origin: 'API',
    status: 'SUCCESS',
  })) {
    console.log(request);
  }
}

{
  // List all requests from the past via callback interface
  client.history((err, request) => {
    if (err) console.error(err);
    console.log(request);
  });
}

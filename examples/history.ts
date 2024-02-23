import { Client } from '../src/index.js';

import { CHAT_MODEL } from './constants.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

{
  // List historical success requests to the API
  const { results } = await client.request.list({
    origin: 'api',
    status: 'success',
  });
  for (const request of results) {
    console.log(request);
  }
}

{
  // List all requests related to a chat conversation
  const { conversation_id } = await client.text.chat.create({
    model_id: CHAT_MODEL,
    messages: [{ role: 'user', content: 'How are you?' }],
  });
  const { results } = await client.request.chat({
    conversationId: conversation_id,
  });
  for (const request of results) {
    console.log(request);
  }
}

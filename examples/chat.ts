import { Client } from '../src/index.js';

import { CHAT_MODEL } from './constants.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

{
  // Start a conversation
  const { conversation_id, results: results1 } = await client.text.chat.create({
    model_id: CHAT_MODEL,
    messages: [
      {
        role: 'system',
        content: 'Answer yes or no',
      },
      {
        role: 'user',
        content: 'Hello, are you a robot?',
      },
    ],
  });
  console.log(results1[0]);

  // Continue the conversation
  const { results: results2 } = await client.text.chat.create({
    conversation_id,
    model_id: CHAT_MODEL,
    messages: [
      {
        role: 'user',
        content: 'Are you sure?',
      },
    ],
  });
  console.log(results2[0]);
}

{
  // Stream
  const stream = await client.text.chat.create_stream({
    model_id: CHAT_MODEL,
    messages: [{ role: 'user', content: 'How are you?' }],
  });
  for await (const chunk of stream) {
    console.log(chunk.results?.at(0)?.generated_text);
  }
}

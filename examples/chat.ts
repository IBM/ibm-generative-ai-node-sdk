import { Client } from '../src/index.js';

const client = new Client({
  apiKey: process.env.GENAI_API_KEY,
});

const model_id = 'google/ul2';

{
  // Start a conversation
  const {
    conversation_id,
    result: { generated_text: answer1 },
  } = await client.chat({
    model_id,
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
  console.log(answer1);

  // Continue the conversation
  const {
    result: { generated_text: answer2 },
  } = await client.chat({
    conversation_id,
    model_id,
    messages: [
      {
        role: 'user',
        content: 'Are you sure?',
      },
    ],
  });
  console.log(answer2);
}

{
  // Chat inteface has the same promise, streaming and callback variants as generate interface

  // Promise
  const data = await client.chat({
    model_id,
    messages: [{ role: 'user', content: 'How are you?' }],
  });
  console.log(data.result.generated_text);
  // Callback
  client.chat(
    { model_id, messages: [{ role: 'user', content: 'How are you?' }] },
    (err, data) => {
      if (err) console.error(err);
      else console.log(data.result.generated_text);
    },
  );
  // Stream
  for await (const chunk of client.chat(
    { model_id, messages: [{ role: 'user', content: 'How are you?' }] },
    { stream: true },
  )) {
    console.log(chunk.result.generated_text);
  }
  // Streaming callbacks
  client.chat(
    {
      model_id: 'google/ul2',
      messages: [{ role: 'user', content: 'How are you?' }],
    },
    { stream: true },
    (err, data) => {
      if (err) console.error(err);
      else if (data) console.log(data.result.generated_text);
      else console.log('EOS');
    },
  );
}

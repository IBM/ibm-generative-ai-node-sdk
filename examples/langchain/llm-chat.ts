import { HumanMessage } from '@langchain/core/messages';

import { GenAIChatModel } from '../../src/langchain/llm-chat.js';
import { Client } from '../../src/index.js';

const makeClient = () =>
  new GenAIChatModel({
    model_id: 'meta-llama/llama-3-70b-instruct',
    client: new Client({
      endpoint: process.env.ENDPOINT,
      apiKey: process.env.API_KEY,
    }),
    parameters: {
      decoding_method: 'greedy',
      min_new_tokens: 1,
      max_new_tokens: 25,
      repetition_penalty: 1.5,
    },
  });

{
  // Basic
  const chat = makeClient();

  const response = await chat.invoke([
    new HumanMessage(
      'What is a good name for a company that makes colorful socks?',
    ),
  ]);

  console.log(response);
}

{
  // Streaming
  const chat = makeClient();

  await chat.invoke([new HumanMessage('Tell me a joke.')], {
    callbacks: [
      {
        handleLLMNewToken(token) {
          console.log(token);
        },
      },
    ],
  });
}

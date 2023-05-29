import { GenAIChatModel } from '../../src/langchain/llm-chat.js';
import { HumanChatMessage } from 'langchain/schema';

const makeClient = (stream?: boolean) =>
  new GenAIChatModel({
    modelId: 'sambanovasystems/bloomchat-176b-v1',
    stream,
    configuration: {
      endpoint: process.env.ENDPOINT,
      apiKey: process.env.API_KEY,
    },
    parameters: {
      decoding_method: 'greedy',
      min_new_tokens: 1,
      max_new_tokens: 25,
      repetition_penalty: 1.5,
    },
    rolesMapping: {
      human: {
        name: 'human',
        stopSequence: '<human>:',
      },
      system: {
        name: 'bot',
        stopSequence: '<bot>:',
      },
    },
  });

{
  // Basic
  const chat = makeClient();

  const response = await chat.call([
    new HumanChatMessage(
      'What is a good name for a company that makes colorful socks?',
    ),
  ]);

  console.log(response);
}

{
  // Streaming
  const chat = makeClient(true);

  await chat.call([new HumanChatMessage('Tell me a joke.')], undefined, [
    {
      handleLLMNewToken(token) {
        console.log(token);
      },
    },
  ]);
}

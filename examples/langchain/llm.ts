import { Client } from '../../src/index.js';
import { GenAIModel } from '../../src/langchain/index.js';

const makeClient = () =>
  new GenAIModel({
    model_id: 'google/flan-t5-xl',
    client: new Client({
      endpoint: process.env.ENDPOINT,
      apiKey: process.env.API_KEY,
    }),
    parameters: {
      decoding_method: 'greedy',
      min_new_tokens: 5,
      max_new_tokens: 25,
      repetition_penalty: 1.5,
    },
    moderations: {
      hap: true,
    },
  });

{
  // Basic
  console.info('---Single Input Example---');
  const model = makeClient();

  const prompt = 'What is a good name for a company that makes colorful socks?';
  console.info(`Request: ${prompt}`);
  const response = await model.invoke(prompt);
  console.log(`Response: ${response}`);
}

{
  console.info('---Multiple Inputs Example---');
  const model = makeClient();

  const prompts = ['What is IBM?', 'What is WatsonX?'];
  console.info('Request prompts:', prompts);
  const response = await model.generate(prompts);
  console.info('Response:', response);
}

{
  console.info('---Streaming Example---');
  const chat = makeClient();

  const prompt = 'What is a molecule?';
  console.info(`Request: ${prompt}`);
  for await (const token of await chat.stream(prompt)) {
    console.info(`Received token: ${token}`);
  }
}

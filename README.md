# IBM Generative AI Node.js SDK (Tech Preview)

This is not the [watsonx.ai](https://www.ibm.com/products/watsonx-ai) Node.js SDK. This is the Node.js SDK for the Tech Preview program for IBM Foundation Models Studio. This SDK brings IBM Generative AI (GenAI) into Node.js programs and provides useful operations and types.

You can start a trial version or request a demo via https://www.ibm.com/products/watsonx-ai.

This library provides convenient access to the Generative AI API from Node.js applications. For a full description of the API, please visit the [Tech Preview API Documentation](https://workbench.res.ibm.com/docs/api-reference).

The SDK supports both TypeScript and JavaScript as well as ESM and CommonJS.

> Looking for the [watsonx.ai](https://www.ibm.com/products/watsonx-ai) Python SDK? Check out the [documentation](https://ibm.github.io/watson-machine-learning-sdk/foundation_models.html).
> Looking for the Python version? Check out [IBM Generative AI Python SDK](https://github.com/IBM/ibm-generative-ai).
> Looking for a command-line interface? Check out [IBM Generative AI CLI](https://github.com/IBM/ibm-generative-ai-cli).

![-----------------------------------------------------](./docs/img/rainbow.png)

## Table of contents

- [Key Features](#key-features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [Roadmap](#roadmap)

![-----------------------------------------------------](./docs/img/rainbow.png)

## Key features

- ⚡️ Performant - processes 1k of short inputs in about 4 minutes
- ☀️ Fault-tolerant - retry strategies and overflood protection
- 🏖️ Worry-free parallel processing - just pass all the data, we take care of the parallel processing
- 🚦 Handles concurrency limiting - even if you have multiple parallel jobs running
- ⏩ Requests are always returned in the respective order
- 🙏 Support both promises and callbacks
- Integrations
  - ⛓️ LangChain - build applications with LLMs through composability

![-----------------------------------------------------](./docs/img/rainbow.png)

## SDK

This is a hybrid package that supports both ESM and CommonJS, so you can use `import` or `require`. This package is Node.js only as using this in browser is not supported as it would expose your API key.

### Installation

Install package using npm:

```shell
npm install @ibm-generative-ai/node-sdk
```

Or using yarn:

```bash
yarn add @ibm-generative-ai/node-sdk
```

### Usage

To use SDK, first you need to create a client. API key can be passed to the client as parameter or by setting `GENAI_API_KEY` environment variable.

```typescript
import { Client } from '@ibm-generative-ai/node-sdk';

const client = new Client({ apiKey: 'pak-.....' });

// Single input
const input = {
  model_id: 'google/flan-ul2',
  input: 'What is the capital of the United Kingdom?',
  parameters: {
    decoding_method: 'greedy',
    min_new_tokens: 1,
    max_new_tokens: 10,
  },
};
const output = await client.generate(input);

// Multiple inputs, processed in parallel, all resolving at once
const inputs = [
  {
    input: 'What is the capital of the United Kingdom?',
    model_id: 'google/flan-ul2',
  },
  { input: 'What is the capital of the Mexico?', model_id: 'google/flan-ul2' },
];
const outputs = await Promise.all(client.generate(inputs));

// Multiple inputs, processed in parallel, resolving in the order of respective inputs
for (const outputPromise of client.generate(inputs)) {
  try {
    console.log(await outputPromise);
  } catch (err) {
    console.error(err);
  }
}

// Single input using callbacks
client.generate(input, (err, output) => {
  if (err) console.error(err);
  else console.log(output);
});

// Multiple inputs using callbacks, processed in parallel, called in the order of respective inputs
client.generate(inputs, (err, output) => {
  if (err) console.error(err);
  else console.log(output);
});
```

### Streams

```typescript
const input = {
  model_id: 'google/flan-ul2',
  input: 'What is the capital of the United Kingdom?',
};

// Streaming (callback style)
client.generate(input, { stream: true }, (err, output) => {
  if (err) {
    console.error(err);
  } else if (output === null) {
    // END of stream
  } else {
    console.log(output.stop_reason);
    console.log(output.generated_token_count);
    console.log(output.input_token_count);
    console.log(output.generated_text);
  }
});

// Streaming (async iterators)
const stream = client.generate(input, {
  stream: true,
});
for await (const chunk of stream) {
  console.log(chunk.stop_reason);
  console.log(chunk.generated_token_count);
  console.log(chunk.input_token_count);
  console.log(chunk.generated_text);
}

// Streaming (built-in stream methods)
const stream = client.generate(input, {
  stream: true,
});
stream.on('data', (chunk) => {
  console.log(chunk.stop_reason);
  console.log(chunk.generated_token_count);
  console.log(chunk.input_token_count);
  console.log(chunk.generated_text);
});
stream.on('error', (err) => {
  console.error('error has occurred', err);
});
stream.on('close', () => {
  console.info('end of stream');
});
```

### Retry

Majority of client methods have built-in retry strategy. Number of retries can be configured either when constructing the client or per each method call. If not specified, defaults to 3.

```typescript
const client = new Client({ apiKey: 'pak-.....', retries: 5 });
client.generate(input, { retries: 8 }); // Maximum of 9 attempts will be made for each request the method invokes
```

### LangChain

[LangChain](https://js.langchain.com/docs/getting-started/guide-llm) is a framework for developing applications powered by language models.
The following example showcases how you can integrate GenAI into your project.

```typescript
import { GenAIModel } from '@ibm-generative-ai/node-sdk/langchain';

const model = new GenAIModel({
  modelId: 'google/ul2',
  parameters: {},
  configuration: {
    apiKey: 'pak-.....',
  },
});
```

#### Basic usage

```typescript
const response = await model.call(
  'What would be a good company name a company that makes colorful socks?',
);

console.log(response); // Fantasy Sockery
```

#### LLM Chain + Prompt Template

```typescript
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';

const prompt = new PromptTemplate({
  template: 'What is a good name for a company that makes {product}?',
  inputVariables: ['product'],
});
// Another way:
// const prompt = PromptTemplate.fromTemplate(
//   "What is a good name for a company that makes {product}?"
// );

const chain = new LLMChain({ llm: model, prompt: prompt });
const { text } = await chain.call({ product: 'clothes' });

console.log(text); // ArcticAegis
```

#### Streaming

```typescript
import { GenAIModel } from '@ibm-generative-ai/node-sdk/langchain';

const model = new GenAIModel({
  modelId: 'google/ul2',
  stream: true,
  parameters: {},
  configuration: {
    apiKey: 'pak-.....',
  },
});

await model.call('Tell me a joke.', undefined, [
  {
    handleLLMNewToken(token: string) {
      console.log(token);
    },
  },
]);
```

#### Chat support

```typescript
import { GenAIChatModel } from '@ibm-generative-ai/node-sdk/langchain';

const client = new GenAIChatModel({
  modelId: 'togethercomputer/gpt-neoxt-chat-base-20b',
  stream: false,
  configuration: {
    endpoint: process.env.ENDPOINT,
    apiKey: process.env.API_KEY,
  },
  parameters: {
    decoding_method: 'greedy',
    min_new_tokens: 10,
    max_new_tokens: 25,
    repetition_penalty: 1.5,
  },
  rolesMapping: {
    human: {
      stopSequence: '<human>:',
    },
    system: {
      stopSequence: '<bot>:',
    },
  },
});

const response = await client.call([
  new SystemChatMessage(
    'You are a helpful assistant that translates English to Spanish.',
  ),
  new HumanChatMessage('I love programming.'),
]);

console.info(response.text); // "Me encanta la programación."
```

#### Prompt Templates (GenAI x LangChain)

For using GenAI Prompt Template in LangChain, there needs to be a conversion between appropriate template syntaxes.
This can be done via helper classes provided within our SDK.

```typescript
import { GenAIPromptTemplate } from '@ibm-generative-ai/node-sdk/langchain';
import { PromptTemplate } from 'langchain/prompts';

// Converting the LangChain Prompt Template (f-string) to GenAI Prompt Template'
const promptTemplate = GenAIPromptTemplate.fromLangChain(
  PromptTemplate.fromTemplate(`Tell me a {adjective} joke about {content}.`),
);
console.log(promptTemplate); // "Tell me a {{adjective}} joke about {{content}}."

// Converting the GenAI Prompt Template to LangChain Prompt Template
const langChainPromptTemplate = GenAIPromptTemplate.toLangChain(
  `Tell me a {{adjective}} joke about {{content}}.`,
);

console.log(langChainPromptTemplate); // "Tell me a {adjective} joke about {content}."
```

![-----------------------------------------------------](./docs/img/rainbow.png)

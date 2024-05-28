# IBM Generative AI Node.js SDK (Tech Preview)

This is not the [watsonx.ai](https://www.ibm.com/products/watsonx-ai) Node.js SDK. This is the Node.js SDK for the Tech Preview program for IBM Foundation Models Studio. This SDK brings IBM Generative AI (GenAI) into Node.js programs and provides useful operations and types.

You can start a trial version or request a demo via https://www.ibm.com/products/watsonx-ai.

This library provides convenient access to the Generative AI API from Node.js applications. For a full description of the API, please visit the [Tech Preview API Documentation](https://bam.res.ibm.com/docs/api-reference).

The SDK supports both TypeScript and JavaScript as well as ESM and CommonJS.

> Looking for the [watsonx.ai](https://www.ibm.com/products/watsonx-ai) Python SDK? Check out the [documentation](https://ibm.github.io/watsonx-ai-python-sdk/foundation_models.html).
> Looking for the Python version? Check out [IBM Generative AI Python SDK](https://github.com/IBM/ibm-generative-ai).
> Looking for a command-line interface? Check out [IBM Generative AI CLI](https://github.com/IBM/ibm-generative-ai-cli).

![-----------------------------------------------------](./docs/img/rainbow.png)

## Table of contents

- [Key Features](#key-features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Usage](#usage)
- [API Reference](#api-reference)
- [Langchain](#langchain)
- [Migration](#migration-from-v1)

![-----------------------------------------------------](./docs/img/rainbow.png)

## Key features

- ⚡️ Performant - processes 1k of short inputs in under a minute
- ☀️ Fault-tolerant - retry strategies and overflood protection
- 🚦 Handles concurrency limiting - even if you have multiple parallel jobs running
- 📌 Aligned with the REST API - clear structure that mirrors service endpoints and data
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

To use the SDK, first you need to create a client. API key can be passed to the client as parameter or by setting `GENAI_API_KEY` environment variable.

```typescript
import { Client } from '@ibm-generative-ai/node-sdk';

const client = new Client({ apiKey: 'pak-.....' });
```

Client contains various services backed by the REST API endpoints, select a service you'd like to use and call CRUDL-like methods on it.

```typescript
const output = await client.text.generation.create({
  model_id: 'google/flan-ul2',
  input: 'What is the capital of the United Kingdom?',
});
```

#### Streams

Some services support output streaming, you can easily recognize streaming methods by their `_stream` suffix.

```typescript
const stream = await client.text.generation.create_stream({
  model_id: 'google/flan-ul2',
  input: 'What is the capital of the United Kingdom?',
});
for await (const output of stream) {
  console.log(output);
}
```

#### Cancellation

All service methods support cancellation via [AbortSignal](https://developer.mozilla.org/en-US/docs/Web/API/AbortSignal). Use the options argument to pass a signal into the method.

```typescript
const output = await client.text.generation.create(
  {
    model_id: 'google/flan-ul2',
    input: 'What is the capital of the United Kingdom?',
  },
  { signal: AbortSignal.timeout(5000) },
);
```

Refer to [examples](./examples/) for further guidance.

### API Reference

The SDK structure closely follows [REST API](https://bam.res.ibm.com/docs/api-reference) endpoints. To use the desired functionality, first locate a [service](./src/services/) and then call appropriate method on it.

```typescript
// Signature template
const output = await client.service[.subservice].method(input, options);

// POST /v2/text/generation
const output = await client.text.generation.create(input, options)
```

Input and output of each method is forwarded to the corresponding endpoint. The SDK exports [typing](./src/schema.ts) for each input and output.

Standalone API reference is NOT available at the moment, please refer to the [REST API Reference](https://bam.res.ibm.com/docs/api-reference) to find the functionality you're looking for and the input/output semantics.

## LangChain

[LangChain](https://js.langchain.com/docs/getting-started/guide-llm) is a framework for developing applications powered by language models.
The following example showcases how you can integrate GenAI into your project.

```typescript
import { Client } from '@ibm-generative-ai/node-sdk';
import { GenAIModel } from '@ibm-generative-ai/node-sdk/langchain';

const model = new GenAIModel({
  modelId: 'google/flan-ul2',
  parameters: {},
  client: new Client({
    apiKey: 'pak-.....',
  }),
});
```

### Basic usage

```typescript
const response = await model.invoke(
  'What would be a good company name a company that makes colorful socks?',
);

console.log(response); // Fantasy Sockery
```

### LLM Chain + Prompt Template

```typescript
import { PromptTemplate } from '@langchain/core/prompts';
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

### Streaming

```typescript
import { Client } from '@ibm-generative-ai/node-sdk';
import { GenAIModel } from '@ibm-generative-ai/node-sdk/langchain';

const model = new GenAIModel({
  modelId: 'google/flan-ul2',
  stream: true,
  parameters: {},
  client: new Client({
    apiKey: 'pak-.....',
  }),
});

await model.invoke('Tell me a joke.', {
  callbacks: [
    {
      handleLLMNewToken(token) {
        console.log(token);
      },
    },
  ],
});
```

### Chat support

```typescript
import { Client } from '@ibm-generative-ai/node-sdk';
import { GenAIChatModel } from '@ibm-generative-ai/node-sdk/langchain';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

const client = new GenAIChatModel({
  model_id: 'meta-llama/llama-3-70b-instruct',
  client: new Client({
    endpoint: process.env.ENDPOINT,
    apiKey: process.env.API_KEY,
  }),
  parameters: {
    decoding_method: 'greedy',
    min_new_tokens: 10,
    max_new_tokens: 25,
    repetition_penalty: 1.5,
  },
});

const response = await client.invoke([
  new SystemMessage(
    'You are a helpful assistant that translates English to Spanish.',
  ),
  new HumanMessage('I love programming.'),
]);

console.info(response.content); // "Me encanta la programación."
```

### Prompt Templates (GenAI x LangChain)

For using GenAI Prompt Template in LangChain, there needs to be a conversion between appropriate template syntaxes.
This can be done via helper classes provided within our SDK.

```typescript
import { GenAIPromptTemplate } from '@ibm-generative-ai/node-sdk/langchain';
import { PromptTemplate } from '@langchain/core/prompts';

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

## Migration from v1

The interface ovehaul in v2 was thorough, almost everything has been affected. This means you have to revisit every usage of Node.js SDK and make necessary adjustments to the interface. On the bright side, you can achieve this mostly by following few simple steps.

Let's say you were calling the following method to perform text generation:

```typescript
const oldOutputs = await client.generate(oldInputs, { timeout });
```

This interface changed as follows:

1. the method is nested inside a service
2. input and output structure has changed a bit
3. timeout has been replaced by signal
4. only a single input is accepted

The new equivalent usage is then

```typescript
const signal = AbortSignal.timeout(timeout);
const output = await Promise.all(
  inputs.map((input) => client.text.generation.create(input, { signal })),
);
```

Additional migration tips:

- output streaming now has a separate method (e.g. `create_stream`)
- binary I/O is done using [Blobs](https://nodejs.org/api/buffer.html#class-blob)
- callback interface is no longer supported, use [callbackify](https://nodejs.org/api/util.html#utilcallbackifyoriginal) wrapper if you have to

![-----------------------------------------------------](./docs/img/rainbow.png)

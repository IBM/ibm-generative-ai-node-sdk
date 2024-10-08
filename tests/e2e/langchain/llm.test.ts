import { PromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';

import { AbortError } from '../../../src/errors.js';
import { GenAIModel } from '../../../src/langchain/llm.js';
import { Client } from '../../../src/client.js';

describe('Langchain', () => {
  const makeModel = (modelId: string) =>
    new GenAIModel({
      model_id: modelId,
      client: new Client({
        endpoint: process.env.ENDPOINT,
        apiKey: process.env.API_KEY,
      }),
      parameters: {
        top_k: 1,
        max_new_tokens: 5,
        min_new_tokens: 2,
      },
    });

  const expectIsString = (value?: unknown) => {
    expect(value).toBeString();
    expect(value).toBeTruthy();
  };

  describe('tokenization', () => {
    it('should correctly calculate tokens', async () => {
      const client = makeModel('google/flan-ul2');
      const tokensCount = await client.getNumTokens(
        'What is the biggest building on this planet?',
      );
      expect(tokensCount).toBePositive();
    });
  });

  it('Serializes', async () => {
    const model = makeModel('google/flan-ul2');
    const serialized = model.toJSON();
    const deserialized = await GenAIModel.fromJSON(serialized, model.client);
    expect(deserialized).toBeInstanceOf(GenAIModel);
  });

  describe('generate', () => {
    // TODO: enable once we will set default model for the test account
    test.skip('should handle empty modelId', async () => {
      const client = makeModel('google/flan-ul2');

      const data = await client.invoke('Who are you?');
      expectIsString(data);
    }, 15_000);

    test('should return correct response for a single input', async () => {
      const client = makeModel('google/flan-ul2');

      const data = await client.invoke('Hello, World');
      expectIsString(data);
    }, 15_000);

    test('should return correct response for each input', async () => {
      const client = makeModel('google/flan-ul2');

      const inputs = ['Hello, World', 'Hello again'];

      const outputs = await client.generate(inputs);
      expect(outputs.generations).toHaveLength(inputs.length);
      expect(outputs.llmOutput).toBeDefined();
      expect(outputs.llmOutput?.generated_token_count).toBeGreaterThan(0);
      expect(outputs.llmOutput?.input_token_count).toBeGreaterThan(0);

      outputs.generations.forEach(([output]) => {
        expect(output.text).toBeTruthy();
        expect(typeof output.text).toBe('string');

        expect(output.generationInfo).toMatchObject({
          generated_token_count: expect.any(Number),
          input_token_count: expect.any(Number),
          stop_reason: expect.any(String),
        });
      });
    }, 20_000);

    test('should reject with ERR_CANCELED when aborted', async () => {
      const model = makeModel('google/flan-ul2');

      const controller = new AbortController();
      const generatePromise = model.generate(['Hello, World'], {
        signal: controller.signal,
      });

      setTimeout(() => {
        controller.abort();
      }, 50);

      await expect(generatePromise).rejects.toBeInstanceOf(AbortError);
    });

    test('should reject with ETIMEDOUT when timed out', async () => {
      const model = makeModel('google/flan-ul2');

      await expect(
        model.invoke('Hello, World', { timeout: 10 }),
      ).rejects.toThrow();
    });

    test('streaming', async () => {
      const client = makeModel('google/flan-t5-xl');

      const tokens: string[] = [];
      const handleText = vi.fn((token: string) => {
        tokens.push(token);
      });

      const stream = await client.stream('Tell me a joke.', {
        callbacks: [
          {
            handleText,
          },
        ],
      });

      const outputs = [];
      for await (const output of stream) {
        outputs.push(output);
      }
      expect(handleText).toHaveBeenCalledTimes(outputs.length);
      expect(tokens.join('')).toStrictEqual(outputs.join(''));
    }, 15_000);
  });

  describe('chaining', () => {
    const model = makeModel('google/flan-t5-xl');

    test('chaining', async () => {
      const prompt = new PromptTemplate({
        template: 'What is a good name for a company that makes {product}?',
        inputVariables: ['product'],
      });
      const outputParser = new StringOutputParser();

      const chain = prompt.pipe(model).pipe(outputParser);
      const text = await chain.invoke({ product: 'colorful socks' });
      expectIsString(text);
    }, 20_000);
  });
});

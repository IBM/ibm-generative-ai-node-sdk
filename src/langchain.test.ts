import { GenAIModel } from './langchain.js';
import { PromptTemplate } from 'langchain/prompts';
import { LLMChain } from 'langchain/chains';

describe('Langchain', () => {
  const makeClient = (modelId: string, stream?: boolean) =>
    new GenAIModel({
      modelId,
      stream,
      configuration: {
        endpoint: process.env.ENDPOINT,
        apiKey: process.env.API_KEY,
      },
    });

  const expectIsString = (value?: unknown) => {
    expect(value).toBeString();
    expect(value).toBeTruthy();
  };

  describe('tokenization', () => {
    it('should correctly calculate tokens', async () => {
      const client = makeClient('google/flan-ul2');
      const tokensCount = await client.getNumTokens(
        'What is the biggest building on this planet?',
      );
      expect(tokensCount).toBePositive();
    });
  });

  describe('generate', () => {
    // TODO: enable once the client/API will support passing empty model
    test.skip('should handle empty modelId', async () => {
      const client = makeClient('');

      const data = await client.call('Who are you?');
      expectIsString(data);
    }, 15_000);

    test('should return correct response for a single input', async () => {
      const client = makeClient('google/flan-ul2');

      const data = await client.call('Hello, World');
      expectIsString(data);
    }, 15_000);

    test('should return correct response for each input', async () => {
      const client = makeClient('google/flan-ul2');

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
      const model = makeClient('google/flan-ul2');

      const controller = new AbortController();
      const generatePromise = model.generate(['Hello, World'], {
        signal: controller.signal,
      });

      setTimeout(() => {
        controller.abort();
      }, 50);

      await expect(generatePromise).rejects.toEqual(
        expect.objectContaining({
          code: 'ERR_CANCELED',
          message: 'canceled',
        }),
      );
    });

    test('should reject with ETIMEDOUT when timed out', async () => {
      const model = makeClient('google/flan-ul2');

      await expect(
        model.call('Hello, World', { timeout: 10 }),
      ).rejects.toThrow();
    });

    test('streaming', async () => {
      const client = makeClient('google/flan-t5-xl', true);

      const tokens: string[] = [];
      const handleNewToken = vi.fn((token: string) => {
        tokens.push(token);
      });

      const output = await client.call('Tell me a joke.', undefined, [
        {
          handleLLMNewToken: handleNewToken,
        },
      ]);

      expect(handleNewToken).toHaveBeenCalled();
      expectIsString(output);
      expect(tokens.join('')).toStrictEqual(output);
    }, 15_000);
  });

  describe('chaining', () => {
    const model = makeClient('google/flan-t5-xl');

    test('chaining', async () => {
      const prompt = new PromptTemplate({
        template: 'What is a good name for a company that makes {product}?',
        inputVariables: ['product'],
      });

      const chain = new LLMChain({ llm: model, prompt: prompt });
      const { text } = await chain.call({ product: 'colorful socks' });
      expectIsString(text);
    }, 20_000);
  });
});

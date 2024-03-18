import range from 'lodash/range.js';

import { Client } from '../../src/client.js';
import { HttpError } from '../../src/errors.js';
import {
  TextChatCreateStreamOutput,
  TextGenerationCreateStreamOutput,
} from '../../src/schema.js';

describe('client', () => {
  let client: Client;
  beforeAll(() => {
    client = new Client({
      endpoint: process.env.ENDPOINT,
      apiKey: process.env.API_KEY,
    });
  });

  describe('generate', () => {
    test('should handle concurrency limits', async () => {
      const inputs = [...Array(20).keys()].map(() => ({
        model_id: 'google/flan-ul2',
        input: 'Hello, World',
      }));

      const requests = inputs.map((input) =>
        client.text.generation.create(input),
      );

      expect.assertions(requests.length);
      for (const request of requests) {
        await expect(request).toResolve();
      }
    }, 200_000);

    describe('streaming', () => {
      const makeValidStream = (input: Record<string, any> = {}) =>
        client.text.generation.create_stream({
          model_id: 'google/flan-ul2',
          input: 'Hello, World',
          parameters: {
            max_new_tokens: 10,
            ...input.parameters,
          },
          moderations: input.moderations,
        });

      const validateStreamChunk = (chunk: TextGenerationCreateStreamOutput) => {
        const isNumberOrNull = (value: unknown) =>
          value === null || !Number.isNaN(value);

        chunk.results?.forEach((result) => {
          expect(result).toBeObject();
          expect(result.generated_token_count).not.toBeNegative();
          expect(result.input_token_count).not.toBeNegative();
          expect(result.stop_reason).toSatisfy(isNumberOrNull);
        });
        expect(chunk.moderation).toBeOneOf([
          undefined,
          expect.objectContaining({ hap: expect.any(Array) }),
        ]);
      };

      test('should correctly process moderation chunks during streaming', async () => {
        const stream = await makeValidStream({
          min_new_tokens: 1,
          max_new_tokens: 5,
          moderations: {
            hap: {
              input: true,
              threshold: 0.01,
            },
          },
        });

        for await (const chunk of stream) {
          validateStreamChunk(chunk);
          if (chunk.moderation) {
            return;
          }
        }
        throw Error('No moderation chunks has been retrieved from the API');
      });

      test('should return valid stream for a single input', async () => {
        const stream = await makeValidStream();

        const chunks = await new Promise<TextGenerationCreateStreamOutput[]>(
          (resolve, reject) => {
            const chunks: TextGenerationCreateStreamOutput[] = [];
            stream.on('data', (chunk) => {
              validateStreamChunk(chunk);
              chunks.push(chunk);
            });
            stream.on('close', () => {
              resolve(chunks);
            });
            stream.on('error', (err) => {
              reject(err);
            });
          },
        );

        expect(chunks.length).toBeGreaterThan(0);
      }, 15_000);

      test('should handle errors', async () => {
        const stream = await client.text.generation.create_stream({
          model_id: 'XXX/XXX',
          input: 'Hello, World',
        });

        await expect(
          new Promise((_, reject) => {
            stream.on('error', reject);
          }),
        ).rejects.toThrow(HttpError);
      }, 5_000);
    });
  });

  describe('chat', () => {
    describe('streaming', () => {
      const makeValidStream = () =>
        client.text.chat.create_stream({
          model_id: 'google/flan-ul2',
          messages: [{ role: 'user', content: 'Hello World!' }],
        });

      const validateStreamChunk = (chunk: TextChatCreateStreamOutput) => {
        expect(chunk).toBeObject();
        expect(chunk).toHaveProperty('conversation_id');
        expect(chunk).toHaveProperty('results');
      };

      test('should return valid stream', async () => {
        const stream = await makeValidStream();

        const chunks: TextChatCreateStreamOutput[] = [];
        for await (const chunk of stream) {
          validateStreamChunk(chunk);
          chunks.push(chunk);
        }

        expect(chunks.length).toBeGreaterThan(0);
      }, 15_000);

      test('should handle errors', async () => {
        const stream = await client.text.chat.create_stream({
          model_id: 'XXX/XXX',
          messages: [{ role: 'user', content: 'Hello World!' }],
        });

        await expect(
          new Promise((_, reject) => {
            stream.on('error', reject);
          }),
        ).rejects.toThrow(HttpError);
      }, 5_000);
    });
  });

  describe('error handling', () => {
    test('should reject with extended error for invalid model', async () => {
      await expect(
        client.text.generation.create({
          model_id: 'invalid-model',
          input: 'Hello, World',
        }),
      ).rejects.toThrow(HttpError);
    });

    test('should reject with ERR_CANCELED when aborted', async () => {
      const controller = new AbortController();

      const generatePromise = client.text.generation.create(
        {
          model_id: 'google/flan-ul2',
          input: 'Hello, World',
        },
        { signal: controller.signal },
      );

      setTimeout(() => {
        controller.abort();
      }, 50);

      await expect(generatePromise).rejects.toHaveProperty(
        'name',
        'AbortError',
      );
    });

    test('should reject with ABORT_ERR when aborted (stream)', async () => {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort();
      }, 50);

      await expect(async () => {
        const stream = await client.text.generation.create_stream(
          {
            model_id: 'google/flan-ul2',
            input: 'Hello, World',
          },
          { signal: controller.signal },
        );
        await new Promise((resolve, reject) => {
          stream.once('finish', resolve);
          stream.once('error', reject);
        });
      }).rejects.toHaveProperty('name', 'AbortError');
    });
  });

  describe('limits', () => {
    test('should handle rate limits', async () => {
      const promise = Promise.all(
        range(0, 50).map(() => client.tune.types({})),
      );
      await expect(promise).toResolve();
    });
  });
});

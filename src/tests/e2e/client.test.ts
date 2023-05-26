import { GenerateResult } from '../../api-types.js';
import { GenerateInput } from '../../client-types.js';
import { Client } from '../../client.js';

describe('client', () => {
  let client: Client;
  beforeAll(() => {
    client = new Client({
      endpoint: process.env.ENDPOINT,
      apiKey: process.env.API_KEY,
    });
  });

  describe('generate', () => {
    test('should return correct response for a single input', async () => {
      const data = await client.generate({
        model_id: 'google/flan-ul2',
        input: 'Hello, World',
      });

      expect(data).toMatchObject({
        generated_text: expect.any(String),
        generated_token_count: expect.any(Number),
        input_token_count: expect.any(Number),
        stop_reason: expect.any(String),
      });
    }, 15_000);

    test('should return correct response for each input', async () => {
      const inputs = [
        {
          model_id: 'google/flan-ul2',
          input: 'Hello, World',
        },
        {
          model_id: 'google/flan-ul2',
          input: 'Hello again',
        },
      ];

      const outputs = await Promise.all(client.generate(inputs));
      expect(outputs.length).toBe(inputs.length);
      outputs.forEach((output) => {
        expect(output).toMatchObject({
          generated_text: expect.any(String),
          generated_token_count: expect.any(Number),
          input_token_count: expect.any(Number),
          stop_reason: expect.any(String),
        });
      });
    }, 20_000);

    test('should handle concurrency limits', async () => {
      const inputs = [...Array(20).keys()].map(() => ({
        model_id: 'google/flan-ul2',
        input: 'Hello, World',
      }));

      const requests = client.generate(inputs);

      expect.assertions(requests.length);
      for (const request of requests) {
        try {
          const output = await request;
          expect(output).toBeTruthy();
        } catch (err) {
          expect(err).not.toMatchObject({
            extensions: {
              code: 'TOO_MANY_REQUESTS',
              reason: 'CONCURRENCY_LIMIT',
            },
          });
        }
      }
    }, 200_000);

    describe('streaming', () => {
      const makeValidStream = () =>
        client.generate(
          {
            model_id: 'google/ul2',
            input: 'Hello, World',
            parameters: {
              min_new_tokens: 5,
              max_new_tokens: 10,
            },
          },
          {
            stream: true,
          },
        );

      const validateStreamChunk = (chunk: GenerateResult) => {
        const isNumberOrNull = (value: unknown) =>
          value === null || !Number.isNaN(value);

        expect(chunk).toBeObject();
        expect(chunk.generated_token_count).not.toBeNegative();
        expect(chunk.input_token_count).not.toBeNegative();
        expect(chunk.stop_reason).toSatisfy(isNumberOrNull);
      };

      test('should throw for multiple inputs', () => {
        expect(() =>
          client.generate(
            [
              {
                model_id: 'google/ul2',
                input: 'Hello, World',
              },
              {
                model_id: 'google/ul2',
                input: 'Hello, World',
              },
            ] as unknown as GenerateInput,
            {
              stream: true,
            },
          ),
        ).toThrowError('Cannot do streaming for more than one input!');
      });

      test('should return valid stream for a single input', async () => {
        const stream = makeValidStream();

        const chunks = await new Promise<GenerateResult[]>(
          (resolve, reject) => {
            const chunks: GenerateResult[] = [];
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

      test('should handle callback approach', async () => {
        const chunks = await new Promise<GenerateResult[]>(
          (resolve, reject) => {
            const chunks: GenerateResult[] = [];
            client.generate(
              {
                model_id: 'google/ul2',
                input: 'Hello, World',
                parameters: {},
              },
              {
                stream: true,
              },
              (err, data) => {
                if (err) {
                  console.info(data);
                  reject(err);
                  return;
                }
                if (data === null) {
                  resolve(chunks);
                  return;
                }
                chunks.push(data);
              },
            );
          },
        );

        expect(chunks.length).toBeGreaterThan(0);
        for (const chunk of chunks) {
          validateStreamChunk(chunk);
        }
      }, 15_000);

      test('should handle errors', async () => {
        const stream = client.generate(
          {
            model_id: 'XXX/XXX',
            input: 'Hello, World',
          },
          {
            stream: true,
          },
        );

        await expect(
          new Promise((_, reject) => {
            stream.on('error', reject);
          }),
        ).rejects.toMatchObject({
          code: 'ERR_NON_2XX_3XX_RESPONSE',
          statusCode: 404,
          message: 'Model not found',
          extensions: {
            code: 'NOT_FOUND',
            state: { model_id: 'XXX/XXX' },
          },
        });
      }, 5_000);
    });
  });

  describe('tokenization', () => {
    test('should return non-empty vocabulary', () => {
      const isNonEmptyString = (value?: unknown): value is string =>
        Boolean(value && typeof value === 'string');

      expect(
        client.tokenize({
          input: 'Hello, how are you? Are you okay?',
          model_id: 'google/flan-t5-xl',
          parameters: {
            return_tokens: true,
          },
        }),
      ).resolves.toEqual(
        expect.objectContaining({
          token_count: expect.toBePositive(),
          tokens: expect.toSatisfyAll(isNonEmptyString),
        }),
      );
    });
  });

  describe('models', () => {
    test('should return some models', async () => {
      const models = await client.models();
      expect(models.length).toBeGreaterThan(0);
    });

    test('should return details of a specific model', async () => {
      const id = 'google/ul2';
      const details = await client.model({ id });
      expect(details).toHaveProperty('id', id);
    });
  });
});

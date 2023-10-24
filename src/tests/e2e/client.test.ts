import { GenerateInput, GenerateOutput } from '../../client/types.js';
import { Client } from '../../client/client.js';
import { RequestCanceledError } from '../../errors.js';

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

    // TODO: enable once we will set default model for the test account
    test.skip('should fallback to default model', async () => {
      const data = await client.generate({
        input: `What's the name of highest building?`,
      });

      expect(data).toMatchObject({
        generated_text: expect.any(String),
        generated_token_count: expect.any(Number),
        input_token_count: expect.any(Number),
        stop_reason: expect.any(String),
      });
    }, 15_000);

    describe('streaming', () => {
      const makeValidStream = (parameters: Record<string, any> = {}) =>
        client.generate(
          {
            model_id: 'google/ul2',
            input: 'Hello, World',
            parameters: {
              max_new_tokens: 10,
              ...parameters,
            },
          },
          {
            stream: true,
          },
        );

      const validateStreamChunk = (chunk: GenerateOutput) => {
        const isNumberOrNull = (value: unknown) =>
          value === null || !Number.isNaN(value);

        expect(chunk).toBeObject();
        expect(chunk.generated_token_count).not.toBeNegative();
        expect(chunk.input_token_count).not.toBeNegative();
        expect(chunk.stop_reason).toSatisfy(isNumberOrNull);
        expect(chunk.moderation).toBeOneOf([
          undefined,
          expect.objectContaining({ hap: expect.any(Array) }),
        ]);
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

      test('should correctly process moderation chunks during streaming', async () => {
        const stream = makeValidStream({
          moderations: {
            min_new_tokens: 1,
            max_new_tokens: 5,
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
        const stream = makeValidStream();

        const chunks = await new Promise<GenerateOutput[]>(
          (resolve, reject) => {
            const chunks: GenerateOutput[] = [];
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
        const chunks = await new Promise<GenerateOutput[]>(
          (resolve, reject) => {
            const chunks: GenerateOutput[] = [];
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

  describe('error handling', () => {
    test('should reject with extended error for invalid model', async () => {
      await expect(
        client.generate({
          model_id: 'invalid-model',
          input: 'Hello, World',
        }),
      ).rejects.toEqual(
        expect.objectContaining({
          code: 'ERR_NON_2XX_3XX_RESPONSE',
          statusCode: 404,
          message: 'Model not found',
          extensions: {
            code: 'NOT_FOUND',
            state: { model_id: 'invalid-model' },
          },
        }),
      );
    });

    test('should reject with ERR_CANCELED when aborted', async () => {
      const controller = new AbortController();

      const generatePromise = client.generate(
        {
          model_id: 'google/flan-ul2',
          input: 'Hello, World',
        },
        { signal: controller.signal },
      );

      setTimeout(() => {
        controller.abort();
      }, 50);

      await expect(generatePromise).rejects.toThrow(RequestCanceledError);
    });

    test('should reject with ABORT_ERR when aborted (stream)', async () => {
      const controller = new AbortController();
      setTimeout(() => {
        controller.abort();
      }, 50);

      await expect(async () => {
        const stream = client.generate(
          {
            model_id: 'google/flan-ul2',
            input: 'Hello, World',
          },
          { signal: controller.signal, stream: true },
        );
        await new Promise((resolve, reject) => {
          stream.once('finish', resolve);
          stream.once('error', reject);
        });
      }).rejects.toThrow(RequestCanceledError);
    });

    test('should reject with ETIMEDOUT when timed out', async () => {
      await expect(
        client.generate(
          { model_id: 'google/flan-ul2', input: 'Hello, World' },
          { timeout: 1, retries: 1 },
        ),
      ).rejects.toEqual(
        expect.objectContaining({
          code: 'ETIMEDOUT',
        }),
      );
    });
  });
});

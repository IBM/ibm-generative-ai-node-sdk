import { Client } from './client.js';
import { lookupApiKey } from './helpers/config.js';
import { lookupEndpoint } from './helpers/config.js';

vi.mock('./helpers/config.js', () => {
  const original = vi.importActual('./helpers/config.js');
  return {
    ...original,
    lookupEndpoint: vi.fn(() => null),
    lookupApiKey: vi.fn(() => null),
  };
});

describe('client', () => {
  const makeClient = () =>
    new Client({ endpoint: process.env.ENDPOINT, apiKey: process.env.API_KEY });

  describe('configuration', () => {
    const cleanEnv = () => {
      delete process.env.GENAI_ENDPOINT;
      delete process.env.GENAI_DEFAULT_ENDPOINT;
      delete process.env.GENAI_API_KEY;
    };

    beforeEach(() => {
      vi.resetAllMocks();
      cleanEnv();
    });
    afterAll(cleanEnv);

    test('should find an endpoint if one is not provided', () => {
      vi.mocked(lookupEndpoint).mockReturnValueOnce('https://foobar');
      const client = new Client({
        apiKey: process.env.API_KEY,
      });
      expect(lookupEndpoint).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test("should throw if endpoint is not provided and can't be found", () => {
      expect(() => new Client({ apiKey: process.env.API_KEY })).toThrowError(
        'endpoint is missing',
      );
      expect(lookupEndpoint).toHaveBeenCalled();
    });

    test('should find an api key if one is not provided', () => {
      vi.mocked(lookupApiKey).mockReturnValueOnce('foobar');
      const client = new Client({
        endpoint: process.env.ENDPOINT,
      });
      expect(lookupApiKey).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test("should throw if api key is not provided and can't be found", () => {
      expect(() => new Client({ endpoint: process.env.ENDPOINT })).toThrowError(
        'API key is missing',
      );
      expect(lookupApiKey).toHaveBeenCalled();
    });

    test('should pass if all required configurations are provided', () => {
      const client = new Client({
        endpoint: process.env.ENDPOINT,
        apiKey: process.env.API_KEY,
      });
      expect(lookupEndpoint).not.toHaveBeenCalled();
      expect(lookupApiKey).not.toHaveBeenCalled();
      expect(client).toBeDefined();
    });
  });

  describe('error handling', () => {
    test('should reject with extended error for invalid model', async () => {
      const client = makeClient();

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
      const client = makeClient();

      const controller = new AbortController();

      const generatePromise = client.generate(
        {
          model_id: 'bigscience/bloom',
          input: 'Hello, World',
        },
        { signal: controller.signal },
      );

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
      const client = makeClient();

      await expect(
        client.generate(
          { model_id: 'bigscience/bloom', input: 'Hello, World' },
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

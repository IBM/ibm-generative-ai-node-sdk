import { Client } from './client.js';
import { lookupApiKey, lookupEndpoint } from '../helpers/config.js';

vi.mock('../helpers/config.js');

describe('client', () => {
  describe('configuration', () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    test('should find an endpoint if one is not provided', () => {
      vi.mocked(lookupEndpoint).mockReturnValueOnce('https://foobar');
      const client = new Client({
        config: {
          apiKey: process.env.API_KEY,
        },
      });
      expect(lookupEndpoint).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test("should throw if endpoint is not provided and can't be found", () => {
      vi.mocked(lookupEndpoint).mockReturnValueOnce(null);
      expect(
        () => new Client({ config: { apiKey: process.env.API_KEY } }),
      ).toThrowError('endpoint is missing');
      expect(lookupEndpoint).toHaveBeenCalled();
    });

    test('should find an api key if one is not provided', () => {
      vi.mocked(lookupApiKey).mockReturnValueOnce('foobar');
      const client = new Client({
        config: { endpoint: process.env.ENDPOINT },
      });
      expect(lookupApiKey).toHaveBeenCalled();
      expect(client).toBeDefined();
    });

    test("should throw if api key is not provided and can't be found", () => {
      vi.mocked(lookupApiKey).mockReturnValueOnce(null);
      expect(
        () => new Client({ config: { endpoint: process.env.ENDPOINT } }),
      ).toThrowError('API key is missing');
      expect(lookupApiKey).toHaveBeenCalled();
    });

    test('should pass if all required configurations are provided', () => {
      const client = new Client({
        config: {
          endpoint: process.env.ENDPOINT,
          apiKey: process.env.API_KEY,
        },
      });
      expect(lookupEndpoint).not.toHaveBeenCalled();
      expect(lookupApiKey).not.toHaveBeenCalled();
      expect(client).toBeDefined();
    });
  });
});

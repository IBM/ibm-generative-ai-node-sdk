import { MOCK_ENDPOINT } from '../mocks/handlers.js';
import { Client } from '../../client.js';

describe('client', () => {
  let client: Client;
  beforeAll(() => {
    client = new Client({
      endpoint: MOCK_ENDPOINT,
      apiKey: 'foobar',
    });
  });

  describe('generate config', () => {
    test('should read the config', async () => {
      const config = await client.generateConfig();
      expect(config).toMatchObject({ model_id: 'foobar' });
    });

    test('should replace the config', async () => {
      const input = {
        model_id: 'google/ul2',
        parameters: {
          decoding_method: 'greedy',
          random_seed: 8,
        },
      };
      const config = await client.generateConfig(input, {
        strategy: 'replace',
      });
      expect(config).toMatchObject(input);
    });

    test('should merge the config', async () => {
      const input = {
        parameters: {
          decoding_method: 'greedy',
          random_seed: 8,
        },
      };
      const config = await client.generateConfig(input, {
        strategy: 'merge',
      });
      expect(config).toMatchObject({ model_id: 'foobar', ...input });
    });

    test('should set and reset the config', async () => {
      const input = {
        model_id: 'google/ul2',
        parameters: {
          decoding_method: 'greedy',
          random_seed: 8,
        },
      };
      const replacedConfig = await client.generateConfig(input, {
        strategy: 'replace',
      });
      expect(replacedConfig).toMatchObject(input);

      const config = await client.generateConfig({ reset: true });
      expect(config).toMatchObject({ model_id: 'foobar' });
    });
  });
});

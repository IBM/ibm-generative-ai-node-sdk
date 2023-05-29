import {
  MOCK_ENDPOINT,
  generateStore,
  modelsStore,
  tokenizeStore,
} from '../mocks/handlers.js';
import { Client } from '../../client.js';

describe('client', () => {
  let client: Client;
  beforeEach(() => {
    client = new Client({
      endpoint: MOCK_ENDPOINT,
      apiKey: 'foobar',
    });
  });

  describe('generate', () => {
    describe('config', () => {
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

    test('should return single output for a single input', async () => {
      const data = await client.generate({
        model_id: 'bigscience/bloom',
        input: 'Hello, World',
      });

      expect(data).toMatchObject(generateStore);
    }, 15_000);

    test('should return multiple outputs for multiple inputs', async () => {
      const inputs = [
        {
          model_id: 'bigscience/bloom',
          input: 'Hello, World',
        },
        {
          model_id: 'bigscience/bloom',
          input: 'Hello again',
        },
      ];

      const outputs = await Promise.all(client.generate(inputs));
      expect(outputs.length).toBe(inputs.length);
      outputs.forEach((output) => {
        expect(output).toMatchObject(generateStore);
      });
    }, 20_000);
  });

  describe('tokenize', () => {
    test('should return tokenize info', () => {
      expect(
        client.tokenize({
          input: 'Hello, how are you? Are you okay?',
          model_id: 'google/flan-t5-xl',
        }),
      ).resolves.toMatchObject(tokenizeStore);
    });
  });

  describe('models', () => {
    test('should return some models', async () => {
      const models = await client.models();
      expect(models.length).toBeGreaterThan(0);
    });

    test('should return details for a given model', async () => {
      const id = modelsStore[0].id;
      const details = await client.model({ id });
      expect(details).toHaveProperty('id', id);
    });
  });
});

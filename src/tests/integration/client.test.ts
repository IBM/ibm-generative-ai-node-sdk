import {
  MOCK_ENDPOINT,
  generateStore,
  modelsStore,
  tokenizeStore,
  tuneMethodsStore,
  tunesStore,
  promptTemplatesStore,
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
      expect(models.length).not.toBeEmpty();
    });

    test('should return details for a given model', async () => {
      const id = modelsStore[0].id;
      const details = await client.model({ id });
      expect(details).toHaveProperty('id', id);
    });
  });

  describe('tunes', () => {
    test('should list all tunes using callbacks', () =>
      new Promise((done) => {
        expect.assertions(tunesStore.length * 2);
        let count = tunesStore.length;
        client.tunes((err, tune) => {
          expect(err).toBeFalsy();
          expect(tune).toBeDefined();
          if (--count === 0) done(undefined);
        });
      }));

    test('should list all tunes', async () => {
      const allTunes = [];
      for await (const tune of client.tunes()) {
        allTunes.push(tune);
      }
      expect(allTunes.length).toBe(tunesStore.length);
      allTunes.forEach((tune, idx) => {
        expect(tune).toHaveProperty('id', tunesStore[idx].id);
      });
    });

    test('should list all tune methods', async () => {
      const tuneMethods = await client.tuneMethods();
      expect(tuneMethods.length).toBe(tuneMethodsStore.length);
    });

    test('should show details of a tune', async () => {
      const { id } = tunesStore[0];
      const tune = await client.tune({ id });
      expect(tune).toHaveProperty('id', id);
    });

    test('should download assets of a completed tune', async () => {
      const {
        id,
        assets: { encoder },
      } = tunesStore[0];
      const tune = await client.tune({ id });
      expect.assertions(1);
      if (tune.status === 'COMPLETED') {
        const content = await tune.downloadAsset('encoder');
        // unfortunately, we don't have Array.fromAsync() in the supported version of Node
        for await (const chunk of content) {
          expect(chunk.toString()).toBe(encoder);
        }
      }
    });

    test('should create a tune', async () => {
      const tune = await client.tune({
        name: 'newTune',
        model_id: 'foo',
        method_id: 'foo',
        task_id: 'foo',
        training_file_ids: [],
      });
      expect(tunesStore.map(({ id }) => id)).toContainEqual(tune.id);
    });

    test('should delete a tune', async () => {
      const { id } = tunesStore[1];
      await client.tune({ id }, { delete: true });
      expect(tunesStore.map(({ id }) => id)).not.toContain({ id });
    });
  });

  describe('prompt templates', () => {
    test('should list all prompt templates using callbacks', () =>
      new Promise((done) => {
        expect.assertions(promptTemplatesStore.length * 2);
        let count = promptTemplatesStore.length;
        client.promptTemplates((err, template) => {
          expect(err).toBeFalsy();
          expect(template).toBeDefined();
          if (--count === 0) done(undefined);
        });
      }));

    test('should list all prompt templates using for-await loop', async () => {
      const templates = [];
      for await (const promptTemplate of client.promptTemplates()) {
        templates.push(promptTemplate);
      }
      expect(templates.length).toBe(promptTemplatesStore.length);
      templates.forEach((promptTemplate, idx) => {
        expect(promptTemplate).toHaveProperty(
          'id',
          promptTemplatesStore[idx].id,
        );
        expect(promptTemplate).toHaveProperty(
          'created_at',
          promptTemplatesStore[idx].created_at,
        );
      });
    });

    test('should show details of a prompt template', async () => {
      const { id } = promptTemplatesStore[0];
      const promptTemplate = await client.promptTemplate({ id });
      expect(promptTemplate).toHaveProperty('id', id);
    });

    test('should create a prompt template', async () => {
      const template = await client.promptTemplate({
        name: 'my template',
        value: 'Hello {{name}}!',
      });
      expect(promptTemplatesStore.map(({ id }) => id)).toContainEqual(
        template.id,
      );
    });

    test('should partially update the prompt template', async () => {
      const template = await client.promptTemplate({
        id: promptTemplatesStore[1].id,
        name: 'Greeting template!',
      });
      expect(template.name).toBe('Greeting template!');
    });

    test('should delete a prompt template', async () => {
      const { id } = promptTemplatesStore[1];
      await client.promptTemplate({ id }, { delete: true });
      expect(promptTemplatesStore.map(({ id }) => id)).not.toContain({ id });
    });

    test('should execute a prompt template', async () => {
      const results = await client.promptTemplateExecute({
        inputs: ['1+1', '2+2', '3+3'],
        template: {
          value: 'Hello {{name}}, how much is {{input}}?',
          data: {
            name: 'GENAI',
          },
        },
      });
      expect(results).toMatchInlineSnapshot(`
        [
          "Hello GENAI, how much is 1+1?",
          "Hello GENAI, how much is 2+2?",
          "Hello GENAI, how much is 3+3?",
        ]
      `);
    });
  });
});

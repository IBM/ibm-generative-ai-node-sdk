import {
  MOCK_ENDPOINT,
  generateStore,
  modelsStore,
  tokenizeStore,
  tuneMethodsStore,
  tunesStore,
  promptTemplatesStore,
  historyStore,
} from '../mocks/handlers.js';
import { Client } from '../../client/client.js';

const dummyTune = {
  name: 'newTune',
  model_id: 'foo',
  method_id: 'foo',
  task_id: 'foo',
  training_file_ids: [],
};

describe('client', () => {
  let client: Client;
  beforeEach(() => {
    client = new Client({
      config: {
        endpoint: MOCK_ENDPOINT,
        apiKey: 'foobar',
      },
    });
  });

  describe('generate', () => {
    describe('config', () => {
      test('should read the config', async () => {
        const config = await client.generate.config.get();
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
        const config = await client.generate.config.replace(input);
        expect(config).toMatchObject(input);
      });

      test('should merge the config', async () => {
        const input = {
          parameters: {
            decoding_method: 'greedy',
            random_seed: 8,
          },
        };
        const config = await client.generate.config.merge(input);
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
        const replacedConfig = await client.generate.config.replace(input);
        expect(replacedConfig).toMatchObject(input);

        const config = await client.generate.config.reset();
        expect(config).toMatchObject({ model_id: 'foobar' });
      });
    });

    test('should return single output for a single input', async () => {
      const data = await client.generate.generate({
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

      const outputs = await Promise.all(client.generate.generate(inputs));
      expect(outputs.length).toBe(inputs.length);
      outputs.forEach((output) => {
        expect(output).toMatchObject(generateStore);
      });
    }, 20_000);
  });

  describe('tokenize', () => {
    test('should return tokenize info', () => {
      expect(
        client.tokenizer.tokenize({
          input: 'Hello, how are you? Are you okay?',
          model_id: 'google/flan-t5-xl',
        }),
      ).resolves.toMatchObject(tokenizeStore);
    });
  });

  describe('models', () => {
    test('should return some models', async () => {
      const models = await client.models.list();
      expect(models.length).not.toBeEmpty();
    });

    test('should return details for a given model', async () => {
      const id = modelsStore[0].id;
      const details = await client.models.get({ id });
      expect(details).toHaveProperty('id', id);
    });
  });

  describe('tunes', () => {
    test('should list all tunes using callbacks', () =>
      new Promise((done) => {
        expect.assertions(tunesStore.length * 2);
        let count = tunesStore.length;
        client.tunes.list((err, tune) => {
          expect(err).toBeFalsy();
          expect(tune).toBeDefined();
          if (--count === 0) done(undefined);
        });
      }));

    test('should list all tunes', async () => {
      const allTunes = [];
      for await (const tune of client.tunes.list()) {
        allTunes.push(tune);
      }
      expect(allTunes.length).toBe(tunesStore.length);
      allTunes.forEach((tune, idx) => {
        expect(tune).toHaveProperty('id', tunesStore[idx].id);
      });
    });

    test('should list all tune methods', async () => {
      const tuneMethods = await client.tunes.listMethods();
      expect(tuneMethods.length).toBe(tuneMethodsStore.length);
    });

    test('should show details of a tune', async () => {
      const { id } = tunesStore[0];
      const tune = await client.tunes.get({ id });
      expect(tune).toHaveProperty('id', id);
    });

    test('should download assets of a completed tune', async () => {
      const {
        id,
        assets: { encoder },
      } = tunesStore[0];
      const tune = await client.tunes.get({ id });
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
      const tune = await client.tunes.create(dummyTune);
      expect(tunesStore.map(({ id }) => id)).toContainEqual(tune.id);
    });

    test('should delete a tune', async () => {
      const { id } = tunesStore[1];
      await client.tunes.remove({ id });
      expect(tunesStore.map(({ id }) => id)).not.toContain({ id });
    });

    test('should not get a deleted tune', async () => {
      const { id } = await client.tunes.create(dummyTune);
      await client.models.get({ id });
      await client.tunes.remove({ id });
      expect(client.tunes.get({ id })).toReject();
    });
  });

  describe('prompt templates', () => {
    test('should list all prompt templates using callbacks', () =>
      new Promise((done) => {
        expect.assertions(promptTemplatesStore.length * 2);
        let count = promptTemplatesStore.length;
        client.promptTemplates.list((err, template) => {
          expect(err).toBeFalsy();
          expect(template).toBeDefined();
          if (--count === 0) done(undefined);
        });
      }));

    test('should list all prompt templates using for-await loop', async () => {
      const templates = [];
      for await (const promptTemplate of client.promptTemplates.list()) {
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
      const promptTemplate = await client.promptTemplates.get({ id });
      expect(promptTemplate).toHaveProperty('id', id);
    });

    test('should create a prompt template', async () => {
      const template = await client.promptTemplates.create({
        name: 'my template',
        value: 'Hello {{name}}!',
      });
      expect(promptTemplatesStore.map(({ id }) => id)).toContainEqual(
        template.id,
      );
    });

    test('should update the prompt template', async () => {
      const template = await client.promptTemplates.update({
        id: promptTemplatesStore[1].id,
        value: promptTemplatesStore[1].value,
        name: 'Greeting template!',
      });
      expect(template.name).toBe('Greeting template!');
    });

    test('should delete a prompt template', async () => {
      const { id } = promptTemplatesStore[1];
      await client.promptTemplates.remove({ id });
      expect(promptTemplatesStore.map(({ id }) => id)).not.toContain({ id });
    });

    test('should execute a prompt template', async () => {
      const results = await client.promptTemplates.print({
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

    test('should not get a deleted prompt template', async () => {
      const { id } = await client.promptTemplates.create({
        name: 'my template',
        value: 'Hello {{name}}!',
      });
      await client.promptTemplates.get({ id });
      await client.promptTemplates.remove({ id });
      expect(client.tunes.get({ id })).toReject();
    });

    test('should get an updated prompt template', async () => {
      const oldName = 'old name';
      const { id } = await client.promptTemplates.create({
        name: oldName,
        value: 'Hello {{name}}!',
      });
      const oldTemplate = await client.promptTemplates.get({ id });
      expect(oldTemplate).toHaveProperty('name', oldName);

      const newName = 'old name';
      await client.promptTemplates.update({
        id,
        name: newName,
        value: 'Hello {{name}}!',
      });
      const newTemplate = await client.promptTemplates.get({ id });
      expect(newTemplate).toHaveProperty('name', newName);
    });
  });

  describe('history', () => {
    test('should list all requests from the past', () =>
      new Promise((done) => {
        expect.assertions(historyStore.length * 2);
        let count = historyStore.length;
        client.history.list((err, entry) => {
          expect(err).toBeFalsy();
          expect(entry).toBeDefined();
          if (--count === 0) done(undefined);
        });
      }));

    test('should list all requests from the past using for-await loop', async () => {
      const entries = [];
      for await (const entry of client.history.list()) {
        entries.push(entry);
        expect(entry).toBeDefined();
      }
      expect(entries.length).toBe(historyStore.length);
    });
  });

  describe('cross method', () => {
    test('should not get deleted tune via model', async () => {
      const { id } = await client.tunes.create(dummyTune);
      await client.models.get({ id });
      await client.tunes.remove({ id });
      expect(client.models.get({ id })).toReject();
    });

    test('should not get deleted tune in models list', async () => {
      const { id } = await client.tunes.create(dummyTune);
      const modelsWithTune = await client.models.list();
      expect(modelsWithTune.map(({ id }) => id)).toContain(id);
      await client.tunes.remove({ id });
      const models = await client.models.list();
      expect(models.map(({ id }) => id)).not.toContain(id);
    });

    test('should get newly added tune in models list', async () => {
      await client.models.list();
      const { id } = await client.tunes.create(dummyTune);
      const models = await client.models.list();
      expect(models.map(({ id }) => id)).toContain(id);
    });
  });
});

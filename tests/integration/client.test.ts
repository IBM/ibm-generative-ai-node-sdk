import {
  MOCK_ENDPOINT,
  modelsStore,
  tokenizeStore,
  tuneMethodsStore,
  tunesStore,
  historyStore,
} from '../mocks/handlers.js';
import { Client } from '../../src/client.js';

const dummyTune = {
  name: 'newTune',
  model_id: 'foo',
  tuning_type: 'prompt_tuning' as const,
  task_id: 'foo',
  training_file_ids: [],
};

describe('client', () => {
  let client: Client;
  beforeEach(() => {
    client = new Client({
      endpoint: MOCK_ENDPOINT,
      apiKey: 'foobar',
    });
  });

  describe('fetch', () => {
    test("should hit endpoint when endpoint contains trailing '/'", async () => {
      const client = new Client({
        endpoint: MOCK_ENDPOINT + '/',
        apiKey: 'foobar',
      });
      await expect(
        client.text.generation.create({
          model_id: 'bigscience/bloom',
          input: 'Hello, World',
        }),
      ).toResolve();
    });
  });

  describe('generate', () => {
    test('should return single output for a single input', async () => {
      const response = await client.text.generation.create({
        model_id: 'bigscience/bloom',
        input: 'Hello, World',
      });
      expect(response.results).toBeArrayOfSize(1);
    }, 15_000);
  });

  describe('tokenize', () => {
    test('should return tokenize info', async () => {
      await expect(
        client.text.tokenization.create({
          input: 'Hello, how are you? Are you okay?',
          model_id: 'google/flan-t5-xl',
        }),
      ).resolves.toMatchObject({ results: [tokenizeStore] });
    });
  });

  describe('chat', () => {
    test('should start a conversation', async () => {
      await expect(
        client.text.chat.create({
          model_id: 'google/flan-t5-xl',
          messages: [
            { role: 'system', content: 'foo' },
            { role: 'user', content: 'bar' },
          ],
        }),
      ).resolves.toHaveProperty('conversation_id');
    });

    test('should continue an existing conversation', async () => {
      await expect(
        client.text.chat.create({
          model_id: 'google/flan-t5-xl',
          conversation_id: 'foo',
          messages: [{ role: 'user', content: 'bar' }],
        }),
      ).resolves.toHaveProperty('conversation_id', 'foo');
    });
  });

  describe('models', () => {
    test('should return some models', async () => {
      const models = await client.model.list({ limit: 100, offset: 0 });
      expect(models.results.length).not.toBeEmpty();
    });

    test('should return details for a given model', async () => {
      const id = modelsStore[0].id;
      const details = await client.model.retrieve({ id });
      expect(details.result).toHaveProperty('id', id);
    });
  });

  describe('tunes', () => {
    test('should list all tunes', async () => {
      const response = await client.tune.list({});
      expect(response.results).toBeArrayOfSize(tunesStore.length);
      response.results.forEach((tune, idx) => {
        expect(tune).toHaveProperty('id', tunesStore[idx].id);
      });
    });

    test('should list all tune methods', async () => {
      const response = await client.tune.types({});
      expect(response.results).toBeArrayOfSize(tuneMethodsStore.length);
    });

    test('should show details of a tune', async () => {
      const { id } = tunesStore[0];
      const response = await client.tune.retrieve({ id });
      expect(response.result).toHaveProperty('id', id);
    });

    test('should download assets of a completed tune', async () => {
      const { id } = tunesStore[0];
      const content = await client.tune.read({ id, type: 'vectors' });
      for await (const chunk of content) {
        expect(chunk).toBeDefined();
      }
    });

    test('should create a tune', async () => {
      const response = await client.tune.create(dummyTune);
      expect(tunesStore.map(({ id }) => id)).toContainEqual(response.result.id);
    });

    test('should delete a tune', async () => {
      const { id } = tunesStore[1];
      await client.tune.delete({ id });
      expect(tunesStore.map(({ id }) => id)).not.toContain({ id });
    });
  });

  describe('request', () => {
    test('should list all requests from the past', async () => {
      const limit = Math.min(2, historyStore.length);
      const response = await client.request.list({ offset: 0, limit });
      expect(response.results).toBeArrayOfSize(limit);
    });
  });

  describe('cross method', () => {
    test('should not get deleted tune via model', async () => {
      const {
        result: { id },
      } = await client.tune.create(dummyTune);
      await client.model.retrieve({ id });
      await client.tune.delete({ id });
      await expect(client.model.retrieve({ id })).toReject();
    });

    test('should not get deleted tune in models list', async () => {
      const {
        result: { id },
      } = await client.tune.create(dummyTune);
      const response = await client.model.list({ limit: 100, offset: 0 });
      expect(response.results.map(({ id }) => id)).toContain(id);
      await client.tune.delete({ id });
      const laterResponse = await client.model.list({ limit: 100, offset: 0 });
      expect(laterResponse.results.map(({ id }) => id)).not.toContain(id);
    });

    test('should get newly added tune in models list', async () => {
      await client.model.list({ limit: 100, offset: 0 });
      const {
        result: { id },
      } = await client.tune.create(dummyTune);
      const response = await client.model.list({ limit: 100, offset: 0 });
      expect(response.results.map(({ id }) => id)).toContain(id);
    });
  });
});

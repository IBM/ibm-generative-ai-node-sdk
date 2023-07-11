import { DefaultBodyType, MockedRequest, RestHandler, rest } from 'msw';
import _ from 'lodash';
import { randomUUID } from 'node:crypto';

export const MOCK_ENDPOINT = 'https://mock';

export let generateConfigStore: Record<string, any>;
export const resetGenerateConfigStore = () => {
  generateConfigStore = {
    model_id: 'foobar',
  };
};

export const generateStore = {
  generated_text: 'foobar',
  generated_token_count: 1,
  input_token_count: 5,
  stop_reason: 'TOKEN_LIMIT',
};

export const tokenizeStore = {
  token_count: 2,
  tokens: ['foo', 'bar'],
};

export const modelsStore = [
  {
    id: 'foo/model',
    name: 'Foo model',
    size: '31B',
    token_limit: 123,
    tags: [],
    source_model_id: null,
    tasks: [],
    model_family: {
      id: 1,
      name: 'foobar',
    },
    schema_generate: { id: 1, value: 'generate schema placeholder' },
    schema_tokenize: { id: 1, value: 'tokenize schema placeholder' },
  },
  {
    id: 'bar/model',
    name: 'Bar model',
    size: '15B',
    token_limit: 456,
    tags: [],
    source_model_id: null,
    tasks: [],
    model_family: {
      id: 1,
      name: 'foobar',
    },
    schema_generate: { id: 1, value: 'generate schema placeholder' },
    schema_tokenize: { id: 1, value: 'tokenize schema placeholder' },
  },
];

export let tunesStore: any[];
export const resetTunesStore = () => {
  tunesStore = [
    {
      id: 'foo',
      status: 'COMPLETED',
      assets: {
        encoder: 'encoderContent',
        logs: 'logsContent',
      },
    },
    {
      id: 'deleteme',
      status: 'PENDING',
    },
  ];
};

export const tuneMethodsStore = [
  { id: 'foo', name: 'Foo' },
  { id: 'bar', name: 'Bar' },
];

export const resetStores = () => {
  resetGenerateConfigStore();
  resetTunesStore();
};
resetStores();

export const handlers: RestHandler<MockedRequest<DefaultBodyType>>[] = [
  // Generate Config
  rest.get(`${MOCK_ENDPOINT}/v1/generate/config`, (req, res, ctx) =>
    res(ctx.status(200), ctx.json(generateConfigStore)),
  ),
  rest.delete(`${MOCK_ENDPOINT}/v1/generate/config`, (req, res, ctx) => {
    resetGenerateConfigStore();
    return res(ctx.status(200), ctx.json(generateConfigStore));
  }),
  rest.put(`${MOCK_ENDPOINT}/v1/generate/config`, async (req, res, ctx) => {
    generateConfigStore = await req.json();
    return res(ctx.status(200), ctx.json(generateConfigStore));
  }),
  rest.patch(`${MOCK_ENDPOINT}/v1/generate/config`, async (req, res, ctx) => {
    generateConfigStore = _.merge({}, generateConfigStore, await req.json());
    return res(ctx.status(200), ctx.json(generateConfigStore));
  }),

  // Generate Limits
  rest.get(`${MOCK_ENDPOINT}/v1/generate/limits`, (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        tokenCapacity: 100,
        tokensUsed: 0,
      }),
    ),
  ),

  // Generate
  rest.post(`${MOCK_ENDPOINT}/v1/generate`, async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.status(200),
      ctx.json({
        results: new Array(body.inputs.length).fill(generateStore),
      }),
    );
  }),

  // Tokenize
  rest.post(`${MOCK_ENDPOINT}/v1/tokenize`, async (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        results: [tokenizeStore],
      }),
    ),
  ),

  // Models
  rest.get(`${MOCK_ENDPOINT}/v1/models`, async (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        results: modelsStore.map(({ id, name, size, token_limit }) => ({
          id,
          name,
          size,
          token_limit,
        })),
      }),
    ),
  ),
  rest.get(`${MOCK_ENDPOINT}/v1/models/:id`, async (req, res, ctx) => {
    const model = modelsStore.find((model) => model.id === req.params.id);
    if (!model) {
      return res(ctx.status(404));
    }
    return res(
      ctx.status(200),
      ctx.json({
        results: model,
      }),
    );
  }),

  // Tunes
  rest.get(`${MOCK_ENDPOINT}/v1/tune_methods`, async (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        results: tuneMethodsStore,
      }),
    ),
  ),
  rest.get(`${MOCK_ENDPOINT}/v1/tunes`, async (req, res, ctx) => {
    const offset = parseInt(req.url.searchParams.get('offset') ?? '0');
    const singleTune = tunesStore[offset];
    if (!singleTune) {
      return res(ctx.status(404));
    }
    return res(
      ctx.status(200),
      ctx.json({
        results: [singleTune],
        totalCount: tunesStore.length,
      }),
    );
  }),
  rest.post(`${MOCK_ENDPOINT}/v1/tunes`, async (req, res, ctx) => {
    const body = await req.json();
    const newTune = { ...body, id: randomUUID() };
    tunesStore.push(newTune);
    return res(
      ctx.status(200),
      ctx.json({
        results: newTune,
      }),
    );
  }),
  rest.get(`${MOCK_ENDPOINT}/v1/tunes/:id`, async (req, res, ctx) => {
    const tune = tunesStore.find((tune: any) => tune.id === req.params.id);
    if (!tune) {
      return res(ctx.status(404));
    }
    return res(
      ctx.status(200),
      ctx.json({
        results: tune,
      }),
    );
  }),
  rest.delete(`${MOCK_ENDPOINT}/v1/tunes/:id`, async (req, res, ctx) => {
    const tunesCount = tunesStore.length;
    tunesStore = tunesStore.filter((tune: any) => tune.id !== req.params.id);
    if (tunesCount === tunesStore.length) {
      res(ctx.status(404));
    }
    return res(ctx.status(204));
  }),
  rest.get(
    `${MOCK_ENDPOINT}/v1/tunes/:id/content/:type`,
    async (req, res, ctx) => {
      const tune = tunesStore.find((tune: any) => tune.id === req.params.id);
      if (!tune) {
        return res(ctx.status(404));
      }
      const type = req.params.type as string;
      if (!['encoder', 'logger'].includes(type)) {
        return res(ctx.status(404));
      }
      return res(ctx.status(200), ctx.body(tune.assets[type]));
    },
  ),
];

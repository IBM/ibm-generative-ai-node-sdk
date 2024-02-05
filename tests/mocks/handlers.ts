import { randomUUID } from 'node:crypto';

import { DefaultBodyType, MockedRequest, RestHandler, rest } from 'msw';
import _ from 'lodash';

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

export let historyStore: any[];
export const resetHistoryStore = () => {
  historyStore = Array(2)
    .fill(null)
    .map((_, index) => ({
      id: String(index + 1),
      duration: 431,
      request: {
        inputs: ['XXX'],
        model_id: 'aaa/bbb',
        parameters: {
          temperature: 0,
          max_new_tokens: 1,
        },
      },
      status: 'SUCCESS',
      created_at: '2022-12-19T22:53:22.000Z',
      response: {
        results: [
          {
            generated_text: 'YYY',
            generated_token_count: 1,
            input_token_count: 2,
            stop_reason: 'MAX_TOKENS',
          },
        ],
        model_id: 'aaa/bbb',
        created_at: '2022-12-19T22:53:22.358Z',
      },
    }));
};

export const chatStore = new Map<string, { role: string; content: string }[]>();
export const resetChatStore = () => {
  chatStore.clear();
  chatStore.set(randomUUID(), [
    { role: 'system', content: 'instruction' },
    { role: 'user', content: 'hello' },
    { role: 'assistant', content: 'hi' },
  ]);
};

export const resetStores = () => {
  resetGenerateConfigStore();
  resetTunesStore();
  resetHistoryStore();
  resetChatStore();
};
resetStores();

export const handlers: RestHandler<MockedRequest<DefaultBodyType>>[] = [
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
  rest.post(`${MOCK_ENDPOINT}/v2/text/generation`, async (req, res, ctx) => {
    const body = await req.json();
    return res(
      ctx.status(200),
      ctx.json({
        results: new Array(body.inputs.length).fill(generateStore),
      }),
    );
  }),

  // Tokenize
  rest.post(`${MOCK_ENDPOINT}/v2/text/tokenization`, async (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        results: [tokenizeStore],
      }),
    ),
  ),

  // Models
  rest.get(`${MOCK_ENDPOINT}/v2/models`, async (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        results: [...modelsStore, ...tunesStore].map(
          ({ id, name, size, token_limit }) => ({
            id,
            name,
            size,
            token_limit,
          }),
        ),
      }),
    ),
  ),
  rest.get(`${MOCK_ENDPOINT}/v2/models/:id`, async (req, res, ctx) => {
    const model = [...modelsStore, ...tunesStore].find(
      (model) => model.id === req.params.id,
    );
    if (!model) {
      return res(ctx.status(404));
    }
    return res(
      ctx.status(200),
      ctx.json({
        result: model,
      }),
    );
  }),

  // Tunes
  rest.get(`${MOCK_ENDPOINT}/v2/tuning_types`, async (req, res, ctx) =>
    res(
      ctx.status(200),
      ctx.json({
        results: tuneMethodsStore,
      }),
    ),
  ),
  rest.get(`${MOCK_ENDPOINT}/v2/tunes`, async (req, res, ctx) => {
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
  rest.post(`${MOCK_ENDPOINT}/v2/tunes`, async (req, res, ctx) => {
    const body = await req.json();
    const newTune = { ...body, id: randomUUID() };
    tunesStore.push(newTune);
    return res(
      ctx.status(200),
      ctx.json({
        result: newTune,
      }),
    );
  }),
  rest.get(`${MOCK_ENDPOINT}/v2/tunes/:id`, async (req, res, ctx) => {
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
  rest.delete(`${MOCK_ENDPOINT}/v2/tunes/:id`, async (req, res, ctx) => {
    const tunesCount = tunesStore.length;
    tunesStore = tunesStore.filter((tune: any) => tune.id !== req.params.id);
    if (tunesCount === tunesStore.length) {
      res(ctx.status(404));
    }
    return res(ctx.status(204));
  }),
  rest.get(
    `${MOCK_ENDPOINT}/v2/tunes/:id/content/:type`,
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

  // History
  rest.get(`${MOCK_ENDPOINT}/v2/requests`, (req, res, ctx) => {
    const offset = parseInt(req.url.searchParams.get('offset') ?? '0');
    const limit = parseInt(req.url.searchParams.get('limit') ?? '1');

    return res(
      ctx.status(200),
      ctx.json({
        results: historyStore.slice(offset, limit),
        totalCount: historyStore.length,
      }),
    );
  }),

  // Chat
  rest.post(`${MOCK_ENDPOINT}/v2/text/chat`, async (req, res, ctx) => {
    const body = await req.json();
    const conversation_id = body.conversation_id ?? randomUUID();
    if (!chatStore.has(conversation_id)) {
      chatStore.set(conversation_id, body.messages);
    } else {
      chatStore.get(conversation_id)?.push(...body.messages);
    }
    const conversation = chatStore.get(conversation_id);
    return res(
      ctx.status(200),
      ctx.json({
        id: randomUUID(),
        model_id: body.model_id,
        created_at: new Date('2022-12-19T22:53:22.000Z'),
        conversation_id,
        results: conversation
          ?.slice(-1)
          .map(({ role, content }) => ({ role, generated_text: content })),
      }),
    );
  }),

  // ERROR
  rest.get(`${MOCK_ENDPOINT}/error`, async (req, res, ctx) =>
    res(
      ctx.status(500),
      ctx.json({
        error: 'Any error',
        message: 'Any message',
        status_code: 500,
      }),
    ),
  ),
];

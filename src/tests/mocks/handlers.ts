import { DefaultBodyType, MockedRequest, RestHandler, rest } from 'msw';
import _ from 'lodash';

export const MOCK_ENDPOINT = 'https://mock';

export let generateConfigStore: Record<string, any>;
export const resetGenerateConfigStore = () => {
  generateConfigStore = {
    model_id: 'foobar',
  };
};

export const resetStores = () => {
  resetGenerateConfigStore();
};
resetStores();

export const handlers: RestHandler<MockedRequest<DefaultBodyType>>[] = [
  // Generate Config Mocks
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
];

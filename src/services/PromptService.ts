import { OmitVersion } from '../utils/types.js';
import { ApiClientOptions } from '../api/client.js';
import { Options } from '../client.js';
import { clientErrorWrapper } from '../utils/errors.js';

import { BaseService } from './BaseService.js';

export class PromptService extends BaseService {
  async list(
    input: OmitVersion<
      ApiClientOptions<'GET', '/v2/prompts'>['params']['query']
    >,
    opts?: Options,
  ) {
    return clientErrorWrapper(
      this._client.GET('/v2/prompts', {
        ...opts,
        params: {
          query: {
            ...input,
            version: '2024-01-10',
          },
        },
      }),
    );
  }

  async retrieve(
    input: OmitVersion<
      ApiClientOptions<'GET', '/v2/prompts/{id}'>['params']['path']
    >,
    opts?: Options,
  ) {
    return clientErrorWrapper(
      this._client.GET('/v2/prompts/{id}', {
        ...opts,
        params: {
          query: {
            version: '2024-01-10',
          },
          path: input,
        },
      }),
    );
  }

  async create(
    input: OmitVersion<ApiClientOptions<'POST', '/v2/prompts'>['body']>,
    opts?: Options,
  ) {
    return clientErrorWrapper(
      this._client.POST('/v2/prompts', {
        body: input,
        params: {
          query: {
            version: '2024-01-10',
          },
        },
      }),
    );
  }

  async delete(
    input: OmitVersion<
      ApiClientOptions<'DELETE', '/v2/prompts/{id}'>['params']['path']
    >,
    opts?: Options,
  ) {
    return clientErrorWrapper(
      this._client.DELETE('/v2/prompts/{id}', {
        ...opts,
        params: {
          query: {
            version: '2023-11-22',
          },
          path: input,
        },
      }),
    );
  }
}

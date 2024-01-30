import { OmitVersion } from '../utils/types.js';
import { ApiClientOptions } from '../api/client.js';
import { clientErrorWrapper } from '../utils/errors.js';
import { Options } from '../client.js';

import { BaseService } from './BaseService.js';

export class ModelService extends BaseService {
  async list(
    input: OmitVersion<
      ApiClientOptions<'GET', '/v2/models'>['params']['query']
    >,
    opts?: Options,
  ) {
    return await clientErrorWrapper(
      this._client.GET('/v2/models', {
        ...opts,
        params: {
          query: {
            ...input,
            version: '2023-11-22',
          },
        },
      }),
    );
  }

  async retrieve(
    input: ApiClientOptions<'GET', '/v2/models/{id}'>['params']['path'],
    opts?: Options,
  ) {
    return clientErrorWrapper(
      this._client.GET('/v2/models/{id}', {
        ...opts,
        params: {
          path: input,
          query: {
            version: '2024-01-10',
          },
        },
      }),
    );
  }
}

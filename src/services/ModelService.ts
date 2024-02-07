import { clientErrorWrapper } from '../utils/errors.js';
import { Options } from '../client.js';
import {
  ModelServiceListInput,
  ModelServiceListOutput,
  ModelServiceRetrieveInput,
  ModelServiceRetrieveOutput,
} from '../schema.js';

import { BaseService } from './BaseService.js';

export class ModelService extends BaseService {
  async list(
    input: ModelServiceListInput,
    opts?: Options,
  ): Promise<ModelServiceListOutput> {
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
    input: ModelServiceRetrieveInput,
    opts?: Options,
  ): Promise<ModelServiceRetrieveOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/models/{id}', {
        ...opts,
        params: {
          path: input,
          query: {
            version: '2024-01-30',
          },
        },
      }),
    );
  }
}

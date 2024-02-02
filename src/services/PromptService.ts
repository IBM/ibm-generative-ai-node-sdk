import { OmitVersion } from '../utils/types.js';
import { ApiClientOptions } from '../api/client.js';
import { Options } from '../client.js';
import { clientErrorWrapper } from '../utils/errors.js';
import {
  PromptServiceCreateInput,
  PromptServiceCreateOutput,
  PromptServiceDeleteInput,
  PromptServiceDeleteOutput,
  PromptServiceListInput,
  PromptServiceListOutput,
  PromptServiceRetrieveInput,
  PromptServiceRetrieveOutput,
} from '../schema.js';

import { BaseService } from './BaseService.js';

export class PromptService extends BaseService {
  async list(
    input: PromptServiceListInput,
    opts?: Options,
  ): Promise<PromptServiceListOutput> {
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
    input: PromptServiceRetrieveInput,
    opts?: Options,
  ): Promise<PromptServiceRetrieveOutput> {
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
    input: PromptServiceCreateInput,
    opts?: Options,
  ): Promise<PromptServiceCreateOutput> {
    return clientErrorWrapper(
      this._client.POST('/v2/prompts', {
        ...opts,
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
    input: PromptServiceDeleteInput,
    opts?: Options,
  ): Promise<PromptServiceDeleteOutput> {
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

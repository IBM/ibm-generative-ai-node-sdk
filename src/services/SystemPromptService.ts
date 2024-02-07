import { Options } from '../client.js';
import {
  SystemPromptServiceCreateInput,
  SystemPromptServiceCreateOutput,
  SystemPromptServiceDeleteInput,
  SystemPromptServiceDeleteOutput,
  SystemPromptServiceListInput,
  SystemPromptServiceListOutput,
  SystemPromptServiceRetrieveInput,
  SystemPromptServiceRetrieveOutput,
  SystemPromptServiceUpdateInput,
  SystemPromptServiceUpdateOutput,
} from '../schema.js';
import { clientErrorWrapper } from '../utils/errors.js';

import { BaseService } from './BaseService.js';

export class SystemPromptService extends BaseService {
  async create(
    input: SystemPromptServiceCreateInput,
    opts?: Options,
  ): Promise<SystemPromptServiceCreateOutput> {
    return clientErrorWrapper(
      this._client.POST('/v2/system_prompts', {
        ...opts,
        body: input,
        params: {
          query: {
            version: '2023-11-22',
          },
        },
      }),
    );
  }

  async retrieve(
    input: SystemPromptServiceRetrieveInput,
    opts?: Options,
  ): Promise<SystemPromptServiceRetrieveOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/system_prompts/{id}', {
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

  async update(
    input: SystemPromptServiceUpdateInput,
    opts?: Options,
  ): Promise<SystemPromptServiceUpdateOutput> {
    const { id, ...body } = input;
    return clientErrorWrapper(
      this._client.PUT('/v2/system_prompts/{id}', {
        ...opts,
        params: {
          query: {
            version: '2023-11-22',
          },
          path: { id },
        },
        body,
      }),
    );
  }

  async delete(
    input: SystemPromptServiceDeleteInput,
    opts?: Options,
  ): Promise<SystemPromptServiceDeleteOutput> {
    return clientErrorWrapper(
      this._client.DELETE('/v2/system_prompts/{id}', {
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

  async list(
    input: SystemPromptServiceListInput,
    opts?: Options,
  ): Promise<SystemPromptServiceListOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/system_prompts', {
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
}

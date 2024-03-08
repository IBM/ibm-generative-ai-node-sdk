import { clientErrorWrapper } from '../utils/errors.js';
import { Options } from '../client.js';
import {
  RequestServiceChatInput,
  RequestServiceChatOutput,
  RequestServiceDeleteInput,
  RequestServiceDeleteOutput,
  RequestServiceListInput,
  RequestServiceListOutput,
} from '../schema.js';

import { BaseService } from './BaseService.js';

export class RequestService extends BaseService {
  async list(
    input: RequestServiceListInput,
    opts?: Options,
  ): Promise<RequestServiceListOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/requests', {
        ...opts,
        params: { query: { ...input, version: '2023-11-22' } },
      }),
    );
  }

  async delete(
    input: RequestServiceDeleteInput,
    opts?: Options,
  ): Promise<RequestServiceDeleteOutput> {
    return clientErrorWrapper(
      this._client.DELETE('/v2/requests/{id}', {
        ...opts,
        params: { path: input, query: { version: '2023-11-22' } },
      }),
    );
  }

  async chat(
    input: RequestServiceChatInput,
    opts?: Options,
  ): Promise<RequestServiceChatOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/requests/chat/{conversation_id}', {
        ...opts,
        params: { path: input, query: { version: '2023-11-22' } },
      }),
    );
  }
}

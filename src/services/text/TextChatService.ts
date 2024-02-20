import { Options } from '../../client.js';
import { clientErrorWrapper } from '../../utils/errors.js';
import {
  TextChatCreateInput,
  TextChatCreateOutput,
  TextChatCreateStreamInput,
  TextChatCreateStreamOutput,
} from '../../schema.js';
import { TypedReadable } from '../../utils/stream.js';
import { BaseService } from '../BaseService.js';
import { ApiClient } from '../../api/client.js';
import { SteamingApiClient } from '../../api/streaming-client.js';
import { ConcurrencyLimiter } from '../../utils/concurrency.js';

export class TextChatService extends BaseService {
  constructor(
    protected readonly _client: ApiClient,
    protected readonly _streamingClient: SteamingApiClient,
    protected readonly _limiter: ConcurrencyLimiter,
  ) {
    super(_client, _streamingClient);
  }

  create(
    input: TextChatCreateInput,
    opts?: Options,
  ): Promise<TextChatCreateOutput> {
    return this._limiter.execute(
      () =>
        clientErrorWrapper(
          this._client.POST('/v2/text/chat', {
            ...opts,
            params: { query: { version: '2024-01-10' } },
            body: input,
          }),
        ),
      { signal: opts?.signal },
    );
  }

  create_stream(
    input: TextChatCreateStreamInput,
    opts?: Options,
  ): Promise<TypedReadable<TextChatCreateStreamOutput>> {
    return this._limiter.execute(
      async () =>
        this._streamingClient.stream({
          url: '/v2/text/chat_stream?version=2024-01-10',
          body: input,
          signal: opts?.signal,
        }),
      { signal: opts?.signal },
    );
  }
}

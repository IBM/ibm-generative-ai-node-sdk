import { Options } from '../../client.js';
import { clientErrorWrapper } from '../../utils/errors.js';
import {
  TextGenerationCreateInput,
  TextGenerationCreateOutput,
  TextGenerationCreateStreamInput,
  TextGenerationCreateStreamOutput,
} from '../../schema.js';
import { TypedReadable } from '../../utils/stream.js';
import { ApiClient } from '../../api/client.js';
import { SteamingApiClient } from '../../api/streaming-client.js';
import { ConcurrencyLimiter } from '../../utils/concurrency.js';
import { BaseService } from '../BaseService.js';

export class TextGenerationService extends BaseService {
  constructor(
    protected readonly _client: ApiClient,
    protected readonly _streamingClient: SteamingApiClient,
    protected readonly _limiter: ConcurrencyLimiter,
  ) {
    super(_client, _streamingClient);
  }

  async create(
    input: TextGenerationCreateInput,
    opts?: Options,
  ): Promise<TextGenerationCreateOutput> {
    return this._limiter.execute(
      () =>
        clientErrorWrapper(
          this._client.POST('/v2/text/generation', {
            ...opts,
            params: { query: { version: '2024-01-10' } },
            body: input,
          }),
        ),
      { signal: opts?.signal },
    );
  }

  create_stream(
    input: TextGenerationCreateStreamInput,
    opts?: Options,
  ): Promise<TypedReadable<TextGenerationCreateStreamOutput>> {
    return this._limiter.execute(
      async () =>
        this._streamingClient.stream({
          url: '/v2/text/generation_stream?version=2023-11-22',
          body: input,
          signal: opts?.signal,
        }),
      { signal: opts?.signal },
    );
  }
}

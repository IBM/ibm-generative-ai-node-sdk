import { Options } from '../../client.js';
import { clientErrorWrapper } from '../../utils/errors.js';
import {
  TextSentenceSimilarityCreateInput,
  TextSentenceSimilarityCreateOutput,
} from '../../schema.js';
import { ApiClient } from '../../api/client.js';
import { SteamingApiClient } from '../../api/streaming-client.js';
import { ConcurrencyLimiter } from '../../utils/concurrency.js';
import { BaseService } from '../BaseService.js';

export class TextSentenceSimilarityService extends BaseService {
  constructor(
    protected readonly _client: ApiClient,
    protected readonly _streamingClient: SteamingApiClient,
    protected readonly _limiter: ConcurrencyLimiter,
  ) {
    super(_client, _streamingClient);
  }

  create(
    input: TextSentenceSimilarityCreateInput,
    opts?: Options,
  ): Promise<TextSentenceSimilarityCreateOutput> {
    return this._limiter.execute(
      () =>
        clientErrorWrapper(
          this._client.POST('/v2/beta/text/sentence-similarity', {
            ...opts,
            params: { query: { version: '2023-11-22' } },
            body: input,
          }),
        ),
      { signal: opts?.signal },
    );
  }
}

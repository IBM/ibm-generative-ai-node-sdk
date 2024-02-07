import { Options } from '../../client.js';
import { clientErrorWrapper } from '../../utils/errors.js';
import {
  TextEmbeddingCreateInput,
  TextEmbeddingCreateOutput,
} from '../../schema.js';
import { LimitedService } from '../LimitedService.js';

export class TextEmbeddingService extends LimitedService {
  create(
    input: TextEmbeddingCreateInput,
    opts?: Options,
  ): Promise<TextEmbeddingCreateOutput> {
    return this._limiter.execute(
      () =>
        clientErrorWrapper(
          this._client.POST('/v2/text/embeddings', {
            ...opts,
            params: { query: { version: '2023-11-22' } },
            body: input,
          }),
        ),
      { signal: opts?.signal },
    );
  }
}

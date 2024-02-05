import { BaseService } from '../BaseService.js';
import { Options } from '../../client.js';
import { clientErrorWrapper } from '../../utils/errors.js';
import {
  TextEmbeddingCreateInput,
  TextEmbeddingCreateOutput,
} from '../../schema.js';

export class TextEmbeddingService extends BaseService {
  create(
    input: TextEmbeddingCreateInput,
    opts?: Options,
  ): Promise<TextEmbeddingCreateOutput> {
    return clientErrorWrapper(
      this._client.POST('/v2/text/embeddings', {
        ...opts,
        params: { query: { version: '2023-11-22' } },
        body: input,
      }),
    );
  }
}

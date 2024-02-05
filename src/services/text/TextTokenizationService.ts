import { BaseService } from '../BaseService.js';
import { Options } from '../../client.js';
import { clientErrorWrapper } from '../../utils/errors.js';
import {
  TextTokenizationCreateInput,
  TextTokenizationCreateOutput,
} from '../../schema.js';

export class TextTokenizationService extends BaseService {
  create(
    input: TextTokenizationCreateInput,
    opts?: Options,
  ): Promise<TextTokenizationCreateOutput> {
    return clientErrorWrapper(
      this._client.POST('/v2/text/tokenization', {
        ...opts,
        params: { query: { version: '2024-01-10' } },
        body: input,
      }),
    );
  }
}

import { Transform, TransformCallback } from 'node:stream';

import { BaseService } from '../BaseService.js';
import { Options } from '../../client.js';
import { clientErrorWrapper } from '../../utils/errors.js';
import {
  TextGenerationCreateInput,
  TextGenerationCreateOutput,
  TextGenerationCreateStreamInput,
  TextGenerationCreateStreamOutput,
} from '../../schema.js';
import { TypedReadable } from '../../utils/stream.js';

export class TextGenerationService extends BaseService {
  create(
    input: TextGenerationCreateInput,
    opts?: Options,
  ): Promise<TextGenerationCreateOutput> {
    return clientErrorWrapper(
      this._client.POST('/v2/text/generation', {
        ...opts,
        params: { query: { version: '2024-01-10' } },
        body: input,
      }),
    );
  }

  create_stream(
    input: TextGenerationCreateStreamInput,
    opts?: Options,
  ): TypedReadable<TextGenerationCreateStreamOutput> {
    return this._streamingClient.stream({
      url: '/v2/text/generation_stream?version=2023-11-22',
      body: input,
      signal: opts?.signal,
    });
  }
}

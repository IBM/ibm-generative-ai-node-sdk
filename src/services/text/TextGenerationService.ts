import { Transform, TransformCallback } from 'node:stream';

import { Options } from '../../client.js';
import { clientErrorWrapper } from '../../utils/errors.js';
import {
  TextGenerationCreateInput,
  TextGenerationCreateOutput,
  TextGenerationCreateStreamInput,
  TextGenerationCreateStreamOutput,
} from '../../schema.js';
import { TypedReadable } from '../../utils/stream.js';
import { LimitedService } from '../LimitedService.js';

export class TextGenerationService extends LimitedService {
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
    return this._limiter.execute(async () =>
      this._streamingClient.stream({
        url: '/v2/text/generation_stream?version=2023-11-22',
        body: input,
        signal: opts?.signal,
      }),
    );
  }
}

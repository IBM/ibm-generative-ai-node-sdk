import { Transform, TransformCallback } from 'node:stream';

import { BaseService } from '../BaseService.js';
import { Options } from '../../client.js';
import { clientErrorWrapper } from '../../utils/errors.js';
import {
  TextGenerationCreateInput,
  TextGenerationCreateOuput,
  TextGenerationCreateStreamInput,
  TextGenerationCreateStreamOuput,
} from '../../schema.js';
import { TypedReadable } from '../../utils/stream.js';

export class TextGenerationService extends BaseService {
  create(
    input: TextGenerationCreateInput,
    opts?: Options,
  ): Promise<TextGenerationCreateOuput> {
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
  ): TypedReadable<TextGenerationCreateStreamOuput> {
    type EventMessage = TextGenerationCreateStreamOuput;

    const stream = new Transform({
      autoDestroy: true,
      objectMode: true,
      transform(
        chunk: EventMessage,
        encoding: BufferEncoding,
        callback: TransformCallback,
      ) {
        try {
          const {
            generated_text = '',
            stop_reason = null,
            input_token_count = 0,
            generated_token_count = 0,
            ...props
          } = (chunk.results || [{}])[0];

          callback(null, {
            generated_text,
            stop_reason,
            input_token_count,
            generated_token_count,
            ...(chunk.moderation && {
              moderation: chunk.moderation,
            }),
            ...props,
          });
        } catch (e) {
          const err = (chunk || e) as unknown as Error;
          callback(err, null);
        }
      },
    });

    this._streamingClient
      .stream<EventMessage>({
        url: '/v2/text/generation_stream?version=2023-11-22',
        body: input,
        signal: opts?.signal,
      })
      .on('error', (err) => stream.emit('error', err))
      .pipe(stream);

    return stream;
  }
}

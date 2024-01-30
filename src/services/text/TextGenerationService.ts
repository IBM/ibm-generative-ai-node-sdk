import { Transform, TransformCallback } from 'node:stream';

import { BaseService } from '../BaseService.js';
import { ApiClientOptions, ApiClientResponse } from '../../api/client.js';
import { Options } from '../../client.js';

export type CreateInput = ApiClientOptions<
  'POST',
  '/v2/text/generation'
>['body'];
export type CreateOutput = ApiClientResponse<
  'POST',
  '/v2/text/generation'
>['data'];

export class TextGenerationService extends BaseService {
  create(input: CreateInput, opts?: Options): Promise<CreateOutput> {
    throw new Error('TODO: not implemented!');
  }

  create_stream(
    input: ApiClientOptions<'POST', '/v2/text/generation_stream'>['body'],
    opts?: Options,
  ) {
    type EventMessage = Required<
      ApiClientResponse<'POST', '/v2/text/generation_stream'>
    >['data'];

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

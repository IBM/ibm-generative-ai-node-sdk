import { Transform, TransformCallback } from 'node:stream';

import { BaseService } from '../BaseService.js';
import { Options } from '../../client.js';
import { clientErrorWrapper } from '../../utils/errors.js';
import {
  TextChatCreateInput,
  TextChatCreateOutput,
  TextChatCreateStreamInput,
  TextChatCreateStreamOutput,
} from '../../schema.js';
import { TypedReadable } from '../../utils/stream.js';

export class TextChatService extends BaseService {
  create(
    input: TextChatCreateInput,
    opts?: Options,
  ): Promise<TextChatCreateOutput> {
    return clientErrorWrapper(
      this._client.POST('/v2/text/chat', {
        ...opts,
        params: { query: { version: '2024-01-10' } },
        body: input,
      }),
    );
  }

  create_stream(
    input: TextChatCreateStreamInput,
    opts?: Options,
  ): TypedReadable<TextChatCreateStreamOutput> {
    type EventMessage = TextChatCreateStreamOutput;

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
        url: '/v2/text/chat_stream?version=2024-01-10',
        body: input,
        signal: opts?.signal,
      })
      .on('error', (err) => stream.emit('error', err))
      .pipe(stream);

    return stream;
  }
}

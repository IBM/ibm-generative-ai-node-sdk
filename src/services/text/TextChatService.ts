import { Transform, TransformCallback } from 'node:stream';

import { Options } from '../../client.js';
import { clientErrorWrapper } from '../../utils/errors.js';
import {
  TextChatCreateInput,
  TextChatCreateOutput,
  TextChatCreateStreamInput,
  TextChatCreateStreamOutput,
} from '../../schema.js';
import { TypedReadable } from '../../utils/stream.js';
import { LimitedService } from '../LimitedService.js';

export class TextChatService extends LimitedService {
  create(
    input: TextChatCreateInput,
    opts?: Options,
  ): Promise<TextChatCreateOutput> {
    return this._limiter.execute(() =>
      clientErrorWrapper(
        this._client.POST('/v2/text/chat', {
          ...opts,
          params: { query: { version: '2024-01-10' } },
          body: input,
        }),
      ),
    );
  }

  create_stream(
    input: TextChatCreateStreamInput,
    opts?: Options,
  ): Promise<TypedReadable<TextChatCreateStreamOutput>> {
    return this._limiter.execute(async () =>
      this._streamingClient.stream({
        url: '/v2/text/chat_stream?version=2024-01-10',
        body: input,
        signal: opts?.signal,
      }),
    );
  }
}

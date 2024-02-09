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
    return this._streamingClient.stream({
      url: '/v2/text/chat_stream?version=2024-01-10',
      body: input,
      signal: opts?.signal,
    });
  }
}

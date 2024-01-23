import { Transform, TransformCallback } from 'node:stream';

import fetchRetry from 'fetch-retry';
import fetch from 'cross-fetch';

import { InvalidInputError } from './errors.js';
import { version } from './buildInfo.js';
import { lookupApiKey, lookupEndpoint } from './helpers/config.js';
import {
  ApiClient,
  ApiClientOptions,
  ApiClientResponse,
  createApiClient,
} from './api/client.js';
import { clientErrorWrapper } from './utils/errors.js';
import type { OmitVersion } from './utils/types.js';
import {
  SteamingApiClient,
  createStreamingApiClient,
} from './api/streaming-client.js';
export interface Configuration {
  apiKey?: string;
  endpoint?: string;
  headers?: Headers;
}

export type Options = { signal?: AbortSignal };

export class Client {
  protected readonly _client: ApiClient;
  protected readonly _streamingClient: SteamingApiClient;

  constructor(config: Configuration = {}) {
    const endpoint = config.endpoint ?? lookupEndpoint();
    if (!endpoint) {
      throw new InvalidInputError('Configuration endpoint is missing!');
    }

    const apiKey = config.apiKey ?? lookupApiKey();
    if (!apiKey) {
      throw new InvalidInputError('Configuration API key is missing!');
    }

    const agent = version ? `node-sdk/${version}` : 'node-sdk';

    const headers = new Headers(config.headers);
    headers.set('user-agent', agent);
    headers.set('x-request-origin', agent);
    headers.set('authorization', `Bearer ${apiKey}`);

    this._client = createApiClient({
      baseUrl: endpoint,
      headers,
      fetch: fetchRetry(fetch) as any, // https://github.com/jonbern/fetch-retry/issues/89
    });
    this._streamingClient = createStreamingApiClient({
      baseUrl: endpoint,
      headers,
    });
  }

  async models(
    input: OmitVersion<
      ApiClientOptions<'GET', '/v2/models'>['params']['query']
    >,
    opts?: Options,
  ) {
    return clientErrorWrapper(
      this._client.GET('/v2/models', {
        ...opts,
        params: {
          query: {
            ...input,
            version: '2023-11-22',
          },
        },
      }),
    );
  }

  async model(
    input: ApiClientOptions<'GET', '/v2/models/{id}'>['params']['path'],
    opts?: Options,
  ) {
    return clientErrorWrapper(
      this._client.GET('/v2/models/{id}', {
        ...opts,
        params: {
          path: input,
          query: {
            version: '2024-01-10',
          },
        },
      }),
    );
  }

  generation_stream(
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

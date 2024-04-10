import {
  EventStreamContentType,
  fetchEventSource,
} from '@ai-zen/node-fetch-event-source';
import { mergeHeaders } from 'openapi-fetch';

import { TypedReadable } from '../utils/stream.js';
import { BaseError, HttpError, InternalError } from '../errors.js';
import { safeParseJson } from '../helpers/common.js';

export interface SteamingApiClient {
  stream: <T>(opts: {
    url: string;
    headers?: Headers;
    body?: any;
    signal?: AbortSignal;
  }) => TypedReadable<T>;
}

export function createStreamingApiClient(clientOptions: {
  baseUrl?: string;
  headers?: Headers;
}): SteamingApiClient {
  return {
    stream: function fetchSSE<T>({
      url,
      headers,
      body,
      signal,
    }: Parameters<SteamingApiClient['stream']>[0]) {
      const outputStream = new TypedReadable<T>({
        autoDestroy: true,
        objectMode: true,
        signal: signal,
      });

      const onClose = () => {
        if (outputStream.readable) {
          outputStream.push(null);
        }
      };

      const delegatedController = new AbortController();
      if (signal) {
        signal.addEventListener(
          'abort',
          () => {
            delegatedController.abort();
          },
          {
            once: true,
          },
        );
      }

      const onError = (e: unknown) => {
        const err =
          e instanceof BaseError
            ? e
            : new InternalError('Unexpected error', { cause: e });

        delegatedController.abort();
        if (outputStream.readable) {
          outputStream.emit('error', err);
          throw err;
        }
        onClose();
      };
      fetchEventSource(new URL(url, clientOptions.baseUrl).toString(), {
        method: 'POST',
        body: JSON.stringify(body),
        headers: Object.fromEntries(
          mergeHeaders(clientOptions.headers, headers, {
            'Content-Type': 'application/json',
          }) as any, // Types are incomplete, support is there in Node 18 https://developer.mozilla.org/en-US/docs/Web/API/Headers
        ),
        signal: delegatedController.signal,
        onclose: onClose,
        async onopen(response) {
          const contentType = response.headers.get('content-type') || '';

          if (response.ok && contentType === EventStreamContentType) {
            return;
          }

          const responseData = contentType.startsWith('application/json')
            ? await response.json().catch(() => null)
            : await response.text();

          onError(new HttpError(responseData));
        },
        onmessage(message) {
          if (message.event === 'close') {
            onClose();
            return;
          }
          if (message.data === '') {
            return;
          }

          const result = safeParseJson(message.data);
          if (result === null) {
            onError(
              new InternalError(
                `Failed to parse message "${JSON.stringify(message)}"`,
              ),
            );
            return;
          }
          if (message.event === 'error') {
            onError(new HttpError(result));
            return;
          }

          outputStream.push(result);
        },
        onerror: onError,
      }).catch(() => {
        /* Prevent uncaught exception (errors are handled inside the stream) */
      });

      return outputStream;
    },
  };
}

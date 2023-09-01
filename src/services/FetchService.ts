import { ZodSchema } from 'zod';
import { TypedReadable } from '../utils/stream.js';
import {
  errorTransformer,
  HttpError,
  InternalError,
  isRetrievableError,
} from '../errors.js';
import { EventStreamContentType, fetchEventSource } from '../utils/sse/sse.js';
import { safeParseJson } from '../helpers/common.js';
import promiseRetry from 'promise-retry';
import {
  AxiosCacheInstance,
  CacheRequestConfig,
} from 'axios-cache-interceptor';
import { Configuration } from '../client/client.js';

type FetchConfig<R, D> = Omit<CacheRequestConfig<R, D>, 'signal'> & {
  retries?: number;
  retryCondition?: (error: unknown) => boolean;
  signal?: AbortSignal;
};
type FetchConfigNoStream<R, D> = FetchConfig<R, D> & {
  stream?: false;
};
type FetchConfigStream<R, D> = FetchConfig<R, D> & {
  stream: true;
};

export class FetchService {
  readonly client: AxiosCacheInstance;
  readonly options: Required<Configuration>;

  constructor(client: AxiosCacheInstance, options: Required<Configuration>) {
    this.client = client;
    this.options = options;
  }

  fetch<Output, Input = undefined>(
    input: FetchConfigStream<Output, Input>,
    schema?: ZodSchema<Output>,
  ): TypedReadable<Output>;
  fetch<Output, Input = undefined>(
    input: FetchConfigNoStream<Output, Input> | FetchConfig<Output, Input>,
    schema?: ZodSchema<Output>,
  ): Promise<Output>;
  fetch<Output, Input = undefined>(
    input:
      | FetchConfigNoStream<Output, Input>
      | FetchConfigStream<Output, Input>,
    schema?: ZodSchema<Output>,
  ): Promise<Output> | TypedReadable<Output> {
    if (input.stream) {
      const outputStream = new TypedReadable<Output>({
        autoDestroy: true,
        objectMode: true,
        signal: input.signal,
      });

      const onClose = () => {
        if (outputStream.readable) {
          outputStream.push(null);
        }
      };

      const delegatedController = new AbortController();
      if (input.signal) {
        input.signal.addEventListener(
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
        const err = errorTransformer(e);

        delegatedController.abort();
        if (outputStream.readable) {
          outputStream.emit('error', err);
          throw err;
        }
        onClose();
      };

      fetchEventSource(`${this.options.endpoint}${input.url}`, {
        method: 'POST',
        body: JSON.stringify(input.data),
        headers: {
          ...this.options.headers,
          'Content-Type': 'application/json',
        },
        signal: delegatedController.signal,
        onclose: onClose,
        async onopen(response) {
          const contentType = response.headers.get('content-type') || '';

          if (response.ok && contentType === EventStreamContentType) {
            return;
          }

          const responseData = contentType.startsWith('application/json')
            ? await response.json().catch(() => null)
            : null;

          const headers = (() => {
            const obj: Record<string, string> = {};
            response.headers?.forEach((value, key) => {
              obj[key] = value;
            });
            return obj;
          })();

          onError(
            new HttpError(
              responseData?.message || 'Invalid response from server',
              response.statusText,
              response.status,
              responseData?.extensions,
              responseData,
              headers,
            ),
          );
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

          outputStream.push(schema ? schema.parse(result) : result);
        },
        onerror: onError,
      }).catch(() => {
        /* Prevent uncaught exception (errors are handled inside the stream) */
      });

      return outputStream;
    }

    const { retries, retryCondition, cache, ...restConfig } = input;
    const timeout = Number.isFinite(Number(input.timeout))
      ? Math.max(1, input.timeout as number)
      : 0;

    return promiseRetry(
      (retry, attempt) =>
        this.client<Output, Input>({
          ...restConfig,
          timeout,
          cache: {
            ...cache,
            override: (cache ? cache.override : false) || attempt > 1,
          },
        }).catch((err) => {
          const error = errorTransformer(err);
          const conditionFn = retryCondition ?? isRetrievableError;

          if (conditionFn(error)) {
            retry(error);
          }
          throw error;
        }),
      { retries: retries ?? this.options.retries },
    ).then(({ data }) => (schema ? schema.parse(data) : data));
  }
}

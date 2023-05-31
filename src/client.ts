import axios, { AxiosError } from 'axios';
import {
  AxiosCacheInstance,
  CacheRequestConfig,
  setupCache,
} from 'axios-cache-interceptor';
import promiseRetry from 'promise-retry';
import http from 'node:http';
import https from 'node:https';
import * as ApiTypes from './api-types.js';
import errorFactory, {
  HttpError,
  InternalError,
  InvalidInputError,
  isRetrievableError,
} from './errors.js';
import {
  GenerateConfigInput,
  GenerateConfigOptions,
  GenerateConfigOutput,
  GenerateInput,
  GenerateLimitsInput,
  GenerateLimitsOutput,
  GenerateOutput,
  HttpHandlerOptions,
  ModelsInput,
  ModelsOutput,
  HttpHandlerNoStreamOptions,
  HttpHandlerStreamOptions,
  TokenizeInput,
  TokenizeOutput,
  ModelInput,
  ModelOutput,
  GenerateConfigInputOptions,
} from './client-types.js';
import { version } from './buildInfo.js';
import {
  safeParseJson,
  Unwrap,
  wait,
  parseFunctionOverloads,
  handle,
  isTypeOf,
} from './helpers/common.js';
import { TypedReadable } from './utils/stream.js';
import { lookupApiKey, lookupEndpoint } from './helpers/config.js';
import { RETRY_ATTEMPTS_DEFAULT } from './constants.js';
import { EventStreamContentType, fetchEventSource } from './utils/sse/sse.js';
import { Transform, TransformCallback } from 'stream';

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

export type RawHeaders = Record<string, string>;

export interface Configuration {
  apiKey?: string;
  endpoint?: string;
  headers?: RawHeaders;
  retries?: HttpHandlerOptions['retries'];
}

type ErrorCallback = (err: unknown) => void;
type DataCallback<T> = (err: unknown, result: T) => void;
export type Callback<T> = ErrorCallback | DataCallback<T>;

export class Client {
  readonly #client: AxiosCacheInstance;
  readonly #options: Required<Configuration>;

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

    this.#options = {
      endpoint,
      apiKey,
      headers: {
        'User-Agent': agent,
        'X-Request-Origin': agent,
        ...config.headers,
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      retries: config.retries ?? RETRY_ATTEMPTS_DEFAULT,
    };

    this.#client = setupCache(
      axios.create({
        baseURL: this.#options.endpoint,
        headers: this.#options.headers,
        httpAgent: new http.Agent({ keepAlive: true }),
        httpsAgent: new https.Agent({ keepAlive: true }),
        maxRedirects: 0,
        transitional: {
          clarifyTimeoutError: true,
        },
      }),
    );
  }

  #fetcher<Output, Input = undefined>(
    input: FetchConfigStream<Output, Input>,
  ): TypedReadable<Output>;
  #fetcher<Output, Input = undefined>(
    input: FetchConfigNoStream<Output, Input> | FetchConfig<Output, Input>,
  ): Promise<Output>;
  #fetcher<Output, Input = undefined>(
    input:
      | FetchConfigNoStream<Output, Input>
      | FetchConfigStream<Output, Input>,
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
        const err = errorFactory(e);

        delegatedController.abort();
        if (outputStream.readable) {
          outputStream.emit('error', err);
          throw err;
        }
        onClose();
      };

      fetchEventSource(`${this.#options.endpoint}${input.url}`, {
        method: 'POST',
        body: JSON.stringify(input.data),
        headers: {
          ...this.#options.headers,
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

          outputStream.push(result);
        },
        onerror: onError,
      }).catch(() => {
        /* Prevent uncaught exception (errors are handled inside the stream) */
      });

      return outputStream;
    }

    const { retries, retryCondition, ...cacheConfig } = input;
    return promiseRetry(
      (retry, attempt) =>
        this.#client<Output, Input>({
          ...cacheConfig,
          timeout:
            input.timeout === undefined || input.timeout === Infinity
              ? 0 // no timeout
              : Math.max(1, input.timeout),
          cache: { ...cacheConfig.cache, override: attempt > 1 },
        }).catch((err) => {
          const error = errorFactory(err);
          const conditionFn = retryCondition ?? isRetrievableError;

          if (conditionFn(error)) {
            retry(error);
          }
          throw error;
        }),
      { retries: retries ?? this.#options.retries },
    ).then((response) => response.data);
  }

  tokenize(
    input: TokenizeInput,
    options?: HttpHandlerOptions,
  ): Promise<TokenizeOutput>;
  tokenize(
    input: TokenizeInput,
    options: HttpHandlerOptions,
    callback: Callback<TokenizeOutput>,
  ): void;
  tokenize(input: TokenizeInput, callback: Callback<TokenizeOutput>): void;
  tokenize(
    { input, ...restInput }: TokenizeInput,
    optionsOrCallback?: HttpHandlerOptions | Callback<TokenizeOutput>,
    callback?: Callback<TokenizeOutput>,
  ): Promise<TokenizeOutput> | void {
    return handle(
      {
        optionsOrCallback,
        callback,
      },
      async ({ options }) => {
        const { results } = await this.#fetcher<
          ApiTypes.TokenizeOutput,
          ApiTypes.TokenizeInput
        >({
          ...options,
          method: 'POST',
          url: '/v1/tokenize',
          data: {
            ...restInput,
            inputs: [input],
          },
          stream: false,
        });

        if (results.length !== 1) {
          throw new InvalidInputError('Unexpected number of results');
        }

        return results[0];
      },
    );
  }

  generate(input: GenerateInput, callback: Callback<GenerateOutput>): void;
  generate(input: GenerateInput[], callback: Callback<GenerateOutput>): void;
  generate(
    input: GenerateInput,
    options: HttpHandlerStreamOptions,
    callback: Callback<GenerateOutput | null>,
  ): void;
  generate(
    input: GenerateInput,
    options: HttpHandlerNoStreamOptions,
    callback: Callback<GenerateOutput>,
  ): void;
  generate(
    input: GenerateInput,
    options?: HttpHandlerNoStreamOptions,
  ): Promise<GenerateOutput>;
  generate(
    input: GenerateInput,
    options: HttpHandlerStreamOptions,
  ): TypedReadable<GenerateOutput>;
  generate(
    input: GenerateInput[],
    options: HttpHandlerNoStreamOptions,
    callback: Callback<GenerateOutput>,
  ): void;
  generate(
    input: GenerateInput[],
    options?: HttpHandlerNoStreamOptions,
  ): Promise<GenerateOutput>[];
  generate(
    input: GenerateInput | GenerateInput[],
    optionsOrCallback?:
      | HttpHandlerNoStreamOptions
      | HttpHandlerStreamOptions
      | Callback<GenerateOutput>
      | Callback<GenerateOutput | null>,
    callbackOrNothing?:
      | Callback<GenerateOutput>
      | Callback<GenerateOutput | null>,
  ):
    | TypedReadable<GenerateOutput>
    | Promise<GenerateOutput>
    | Promise<GenerateOutput>[]
    | void {
    const { callback, options } = parseFunctionOverloads(
      undefined,
      optionsOrCallback,
      callbackOrNothing,
    );

    // Track time for timeout
    const getTimeout = (() => {
      const start = Date.now();
      const timeout = options?.timeout ?? this.#client.defaults.timeout;

      return () =>
        Math.max(0, timeout ? timeout - (Date.now() - start) : Infinity);
    })();

    // Normalize inputs
    const inputs = !Array.isArray(input) ? [input] : input;

    const prepareRequest = ({
      input: inputText,
      ...params
    }: Unwrap<typeof input>) => ({
      ...options,
      method: 'POST',
      url: '/v1/generate',
      data: {
        ...params,
        inputs: [inputText],
        use_default: true,
        parameters: {
          ...params.parameters,
          stream: Boolean(options?.stream),
        },
      },
    });

    if (options?.stream) {
      if (inputs.length > 1) {
        throw new InvalidInputError(
          'Cannot do streaming for more than one input!',
        );
      }
      const stream = new Transform({
        autoDestroy: true,
        objectMode: true,
        transform(
          chunk: ApiTypes.GenerateOutput,
          encoding: BufferEncoding,
          callback: TransformCallback,
        ) {
          try {
            const {
              generated_text = '',
              stop_reason = null,
              input_token_count = 0,
              generated_token_count = 0,
            } = chunk.results[0];

            callback(null, {
              generated_text,
              stop_reason,
              input_token_count,
              generated_token_count,
            } as ApiTypes.GenerateResult);
          } catch (e) {
            const err = (chunk || e) as unknown as Error;
            callback(err, null);
          }
        },
      });

      this.#fetcher<ApiTypes.GenerateOutput, ApiTypes.GenerateInput>({
        ...prepareRequest(inputs[0]),
        timeout: getTimeout(),
        stream: true,
      })
        .on('error', (err) => stream.emit('error', errorFactory(err)))
        .pipe(stream);

      if (!callback) {
        return stream;
      }

      stream.on('data', (data) => callback(null, data));
      stream.on('error', (err) => (callback as ErrorCallback)(err));
      stream.on('finish', () =>
        (callback as DataCallback<GenerateOutput | null>)(null, null),
      );

      return;
    }

    // Token calculation is considered public API
    const tokenCounts = inputs.map(() => 1);

    const promises = inputs.map(async (inputData, index, arr) => {
      try {
        // Retry on concurrency limit error
        while (getTimeout() > 0) {
          // Cached limits preflight
          const limits = await this.generateLimits(undefined, {
            ...options,
            timeout: getTimeout(),
          });

          // Check if the input fits into the capacity given previous inputs have precedence
          const cumulativeTokenCount = tokenCounts
            .slice(0, index + 1)
            .reduce((acc, value) => acc + value, 0); // sum
          const isWithinLimits =
            limits.tokensUsed + cumulativeTokenCount <= limits.tokenCapacity;

          // If within concurrency limits, try to execute the request
          if (isWithinLimits) {
            try {
              const { results } = await this.#fetcher<
                ApiTypes.GenerateOutput,
                ApiTypes.GenerateInput
              >({
                ...prepareRequest(inputData),
                timeout: getTimeout(),
              });

              if (results.length !== 1) {
                throw new InternalError('Unexpected number of results');
              }
              return results[0];
            } catch (err) {
              if (
                err instanceof HttpError &&
                err.extensions?.code === 'TOO_MANY_REQUESTS' &&
                err.extensions?.reason === 'CONCURRENCY_LIMIT'
              ) {
                continue;
              }
              throw err;
            }
          }
          await wait(Math.min(getTimeout(), 1000));
        }
        throw new AxiosError('Timeout exceeded', AxiosError.ETIMEDOUT);
      } finally {
        tokenCounts[index] = 0;
        await Promise.allSettled(arr.slice(0, index)); // Settle promises in-order
      }
    });

    if (callback) {
      promises.forEach((promise) =>
        promise.then(
          (data) => callback(null as never, data),
          (err) => (callback as ErrorCallback)(err),
        ),
      );
    } else {
      return Array.isArray(input) ? promises : promises[0];
    }
  }

  generateConfig(
    options: GenerateConfigOptions,
    callback: Callback<GenerateConfigOutput>,
  ): void;
  generateConfig(
    options?: GenerateConfigOptions,
  ): Promise<GenerateConfigOutput>;
  generateConfig(
    input: GenerateConfigInput,
    options?: GenerateConfigInputOptions,
  ): Promise<GenerateConfigOutput>;
  generateConfig(
    input: GenerateConfigInput,
    options?: GenerateConfigInputOptions,
  ): Promise<GenerateConfigOutput>;
  generateConfig(
    input: GenerateConfigInput,
    options: GenerateConfigInputOptions,
    callback: Callback<GenerateConfigOutput>,
  ): void;
  generateConfig(
    input: GenerateConfigInput,
    callback: Callback<GenerateConfigOutput>,
  ): void;
  generateConfig(
    inputOrResetOptions?: GenerateConfigInput | GenerateConfigOptions,
    optionsOrCallback?:
      | GenerateConfigInputOptions
      | Callback<GenerateConfigOutput>,
    callback?: Callback<GenerateConfigOutput>,
  ): Promise<GenerateConfigOutput> | void {
    return handle<
      GenerateConfigInput | GenerateConfigOptions,
      GenerateConfigInputOptions | Callback<GenerateConfigOutput>,
      Callback<GenerateConfigOutput>,
      GenerateConfigOutput
    >(
      {
        inputOrOptionsOrCallback: inputOrResetOptions,
        optionsOrCallback: optionsOrCallback,
        callback,
      },
      ({ input, options }) => {
        if (
          isTypeOf<GenerateConfigOptions | undefined>(
            input,
            !input || 'reset' in input,
          )
        ) {
          const { reset, ...httpOptions } = input ?? {};
          const GET_GENERATE_CONFIG_ID = 'get-generate-config';

          if (reset) {
            return this.#fetcher<ApiTypes.GenerateConfigOutput>({
              ...httpOptions,
              method: 'DELETE',
              url: '/v1/generate/config',
              cache: {
                update: {
                  [GET_GENERATE_CONFIG_ID]: 'delete',
                },
              },
            });
          } else {
            return this.#fetcher<ApiTypes.GenerateConfigOutput>({
              ...httpOptions,
              method: 'GET',
              url: '/v1/generate/config',
              id: GET_GENERATE_CONFIG_ID,
              cache: {
                update: {
                  [GET_GENERATE_CONFIG_ID]: 'delete',
                },
              },
            });
          }
        }

        const { strategy, ...httpOptions } = options ?? {};
        return this.#fetcher<
          ApiTypes.GenerateConfigOutput,
          ApiTypes.GenerateConfigInput
        >({
          ...httpOptions,
          method: strategy === 'merge' ? 'PATCH' : 'PUT',
          url: '/v1/generate/config',
          stream: false,
          data: input,
        });
      },
    );
  }

  generateLimits(
    input?: GenerateLimitsInput,
    options?: HttpHandlerOptions,
  ): Promise<GenerateLimitsOutput>;
  generateLimits(callback: Callback<GenerateLimitsOutput>): void;
  generateLimits(
    input: GenerateLimitsInput,
    callback: Callback<GenerateLimitsOutput>,
  ): void;
  generateLimits(
    input: GenerateLimitsInput,
    options: HttpHandlerOptions,
    callback: Callback<GenerateLimitsOutput>,
  ): void;
  generateLimits(
    inputOrCallback: GenerateLimitsInput,
    optionsOrCallback?: HttpHandlerOptions | Callback<GenerateLimitsOutput>,
    callback?: Callback<GenerateLimitsOutput>,
  ): Promise<GenerateLimitsOutput> | void {
    return handle(
      {
        inputOrOptionsOrCallback: inputOrCallback,
        optionsOrCallback: optionsOrCallback,
        callback,
      },
      ({ options }) =>
        this.#fetcher<ApiTypes.GenerateLimitsOutput>({
          ...options,
          method: 'GET',
          url: '/v1/generate/limits',
          cache: {
            ttl: 1_000,
          },
        }),
    );
  }

  models(callback: Callback<ModelsOutput>): void;
  models(input: ModelsInput, callback: Callback<ModelsOutput>): void;
  models(
    input: ModelsInput,
    options: HttpHandlerOptions,
    callback: Callback<ModelsOutput>,
  ): void;
  models(
    input?: ModelsInput,
    options?: HttpHandlerOptions,
  ): Promise<ModelsOutput>;
  models(
    inputOrCallback?: ModelsInput | Callback<ModelsOutput>,
    optionsOrCallback?: HttpHandlerOptions | Callback<ModelsOutput>,
    callback?: Callback<ModelsOutput>,
  ): Promise<ModelsOutput> | void {
    return handle(
      {
        inputOrOptionsOrCallback: inputOrCallback,
        optionsOrCallback,
        callback,
      },
      async ({ options }) => {
        const { results } = await this.#fetcher<ApiTypes.ModelsOutput>({
          ...options,
          method: 'GET',
          url: '/v1/models',
        });
        return results;
      },
    );
  }

  model(input: ModelInput, options?: HttpHandlerOptions): Promise<ModelOutput>;
  model(
    input: ModelInput,
    options: HttpHandlerOptions,
    callback: Callback<ModelOutput>,
  ): void;
  model(input: ModelInput, callback: Callback<ModelOutput>): void;
  model(
    input: ModelInput,
    optionsOrCallback?: HttpHandlerOptions | Callback<ModelOutput>,
    callback?: Callback<ModelOutput>,
  ): Promise<ModelOutput> | void {
    return handle(
      {
        optionsOrCallback,
        callback,
      },
      async ({ options }) => {
        const { results } = await this.#fetcher<ApiTypes.ModelOutput>({
          ...options,
          method: 'GET',
          url: `/v1/models/${encodeURIComponent(input.id)}`,
        });
        return results;
      },
    );
  }
}

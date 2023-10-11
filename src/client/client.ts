import http, { IncomingMessage } from 'node:http';
import https from 'node:https';
import { Transform, TransformCallback } from 'stream';

import axios, { AxiosError } from 'axios';
import FormData from 'form-data';
import {
  AxiosCacheInstance,
  CacheRequestConfig,
  setupCache,
} from 'axios-cache-interceptor';
import promiseRetry from 'promise-retry';
import {
  EventStreamContentType,
  fetchEventSource,
} from '@ai-zen/node-fetch-event-source';
import { ZodSchema } from 'zod';

import * as ApiTypes from '../api-types.js';
import {
  errorTransformer,
  HttpError,
  InternalError,
  InvalidInputError,
  isRetrievableError,
} from '../errors.js';
import type { StrictUnion } from '../types.js';
import { version } from '../buildInfo.js';
import {
  safeParseJson,
  Unwrap,
  wait,
  parseFunctionOverloads,
  handle,
  isTypeOf,
  handleGenerator,
  paginator,
  isEmptyObject,
} from '../helpers/common.js';
import { TypedReadable } from '../utils/stream.js';
import { lookupApiKey, lookupEndpoint } from '../helpers/config.js';
import { RETRY_ATTEMPTS_DEFAULT } from '../constants.js';

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
  TunesInput,
  TunesOutput,
  TuneCreateInput,
  TuneOutput,
  TuneOptions,
  TuneInput,
  TuneCreateOptions,
  TuneMethodsOutput,
  TuneMethodsInput,
  TuneAssetType,
  PromptTemplatesOutput,
  PromptTemplatesInput,
  PromptTemplateCreateInput,
  PromptTemplateOutput,
  PromptTemplateOptions,
  PromptTemplateDeleteOptions,
  PromptTemplateInput,
  PromptTemplateExecuteInput,
  PromptTemplateExecuteOptions,
  PromptTemplateExecuteOutput,
  PromptTemplateUpdateInput,
  HistoryInput,
  HistoryOptions,
  HistoryOutput,
  FileInput,
  FileOutput,
  FileOptions,
  FileDeleteOptions,
  FileCreateInput,
  FilesOutput,
  FilesInput,
  FileDeleteOutput,
  PromptTemplateDeleteOutput,
} from './types.js';
import { CacheDiscriminator, generateCacheKey } from './cache.js';

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
    schema?: ZodSchema<Output>,
  ): TypedReadable<Output>;
  #fetcher<Output, Input = undefined>(
    input: FetchConfigNoStream<Output, Input> | FetchConfig<Output, Input>,
    schema?: ZodSchema<Output>,
  ): Promise<Output>;
  #fetcher<Output, Input = undefined>(
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
      const url = new URL(
        input.url ?? this.#options.endpoint,
        this.#options.endpoint,
      );
      fetchEventSource(url.toString(), {
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

          outputStream.push(schema ? schema.parse(result) : result);
        },
        onerror: onError,
      }).catch(() => {
        /* Prevent uncaught exception (errors are handled inside the stream) */
      });

      return outputStream;
    }

    const { retries, retryCondition, cache, ...restConfig } = input;
    return promiseRetry(
      (retry, attempt) =>
        this.#client<Output, Input>({
          ...restConfig,
          timeout:
            input.timeout === undefined || input.timeout === Infinity
              ? 0 // no timeout
              : Math.max(1, input.timeout),
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
      { retries: retries ?? this.#options.retries },
    ).then(({ data }) => (schema ? schema.parse(data) : data));
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
            use_default: true,
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
        use_default: !params.prompt_id,
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
            } as GenerateOutput);
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
        .on('error', (err) => stream.emit('error', errorTransformer(err)))
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
        const cacheKey = generateCacheKey(CacheDiscriminator.GENERATE_CONFIG);
        if (
          isTypeOf<GenerateConfigOptions | undefined>(
            input,
            !input || 'reset' in input,
          )
        ) {
          const { reset, ...httpOptions } = input ?? {};
          if (reset) {
            return this.#fetcher<ApiTypes.GenerateConfigOutput>({
              ...httpOptions,
              method: 'DELETE',
              url: '/v1/generate/config',
              cache: {
                update: {
                  [cacheKey]: 'delete',
                },
              },
            });
          } else {
            return this.#fetcher<ApiTypes.GenerateConfigOutput>({
              ...httpOptions,
              method: 'GET',
              url: '/v1/generate/config',
              id: cacheKey,
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
          cache: {
            update: {
              [cacheKey]: 'delete',
            },
          },
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
          id: generateCacheKey(CacheDiscriminator.MODELS),
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
          id: generateCacheKey(CacheDiscriminator.MODEL, input.id),
        });
        return results;
      },
    );
  }

  tunes(callback: Callback<TunesOutput>): void;
  tunes(input: TunesInput, callback: Callback<TunesOutput>): void;
  tunes(
    input: TunesInput,
    options: HttpHandlerOptions,
    callback: Callback<TunesOutput>,
  ): void;
  tunes(
    input?: TunesInput,
    options?: HttpHandlerOptions,
  ): AsyncGenerator<TunesOutput>;
  tunes(
    inputOrCallback?: TunesInput | Callback<TunesOutput>,
    optionsOrCallback?: HttpHandlerOptions | Callback<TunesOutput>,
    callback?: Callback<TunesOutput>,
  ): AsyncGenerator<TunesOutput> | void {
    return handleGenerator<
      TunesInput | Callback<TunesOutput>,
      HttpHandlerOptions | Callback<TunesOutput>,
      Callback<TunesOutput>,
      TunesOutput
    >(
      {
        inputOrOptionsOrCallback: inputOrCallback,
        optionsOrCallback,
        callback,
      },
      ({ input, options }) => {
        const params = new URLSearchParams();
        if (input?.filters?.search) params.set('search', input.filters.search);
        if (input?.filters?.status) params.set('status', input.filters.status);
        return paginator(
          (paginatorParams) =>
            this.#fetcher<ApiTypes.TunesOuput>({
              ...options,
              method: 'GET',
              url: `/v1/tunes?${paginatorParams.toString()}`,
              cache: false,
            }),
          {
            offset: input?.filters?.offset ?? undefined,
            count: input?.filters?.count ?? undefined,
            params,
          },
        );
      },
    );
  }

  tune(
    input: TuneCreateInput,
    options?: TuneCreateOptions,
  ): Promise<TuneOutput>;
  tune(input: TuneInput, options?: TuneOptions): Promise<TuneOutput>;
  tune(
    input: TuneCreateInput,
    options: TuneCreateOptions,
    callback: Callback<TuneOutput>,
  ): void;
  tune(input: TuneInput, options: TuneOptions, callback: Callback<void>): void;
  tune(input: TuneCreateInput, callback: Callback<TuneOutput>): void;
  tune(input: TuneInput, callback: Callback<void>): void;
  tune(
    input: TuneCreateInput | TuneInput,
    optionsOrCallback?:
      | TuneCreateOptions
      | TuneOptions
      | Callback<TuneOutput>
      | Callback<void>,
    callback?: Callback<TuneOutput> | Callback<void>,
  ): Promise<TuneOutput | void> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      let apiOutput: ApiTypes.TuneOutput;
      const isTuneInput = isTypeOf<TuneInput>(input, 'id' in input);
      if (isTuneInput) {
        const cacheKey = generateCacheKey(CacheDiscriminator.TUNE, input.id);
        const opts = options as TuneOptions | undefined;
        if (opts?.delete) {
          await this.#fetcher({
            ...options,
            method: 'DELETE',
            url: `/v1/tunes/${encodeURIComponent(input.id)}`,
            cache: {
              update: {
                [cacheKey]: 'delete',
                [generateCacheKey(CacheDiscriminator.MODEL, input.id)]:
                  'delete',
                [generateCacheKey(CacheDiscriminator.MODELS)]: 'delete',
              },
            },
          });
          return;
        } else {
          apiOutput = await this.#fetcher<ApiTypes.TuneOutput>({
            ...options,
            method: 'GET',
            url: `/v1/tunes/${encodeURIComponent(input.id)}`,
            id: cacheKey,
          });
        }
      } else {
        apiOutput = await this.#fetcher<
          ApiTypes.TuneOutput,
          ApiTypes.TuneInput
        >({
          ...options,
          method: 'POST',
          url: `/v1/tunes`,
          data: input,
          cache: {
            update: {
              [generateCacheKey(CacheDiscriminator.MODELS)]: 'delete',
            },
          },
        });
      }
      const { status } = apiOutput.results;
      switch (status) {
        case 'COMPLETED':
          return {
            ...apiOutput.results,
            status,
            downloadAsset: async (type: TuneAssetType) =>
              this.#fetcher<IncomingMessage>({
                ...options,
                responseType: 'stream',
                method: 'GET',
                url: `/v1/tunes/${encodeURIComponent(
                  apiOutput.results.id,
                )}/content/${type}`,
                cache: false,
              }),
          };
        default:
          return { ...apiOutput.results, status };
      }
    });
  }

  tuneMethods(callback: Callback<TuneMethodsOutput>): void;
  tuneMethods(
    input: TuneMethodsInput,
    callback: Callback<TuneMethodsOutput>,
  ): void;
  tuneMethods(
    input: TuneMethodsInput,
    options: HttpHandlerOptions,
    callback: Callback<TuneMethodsOutput>,
  ): void;
  tuneMethods(
    input?: TuneMethodsInput,
    options?: HttpHandlerOptions,
  ): Promise<TuneMethodsOutput>;
  tuneMethods(
    inputOrCallback?: TuneMethodsInput | Callback<TuneMethodsOutput>,
    optionsOrCallback?: HttpHandlerOptions | Callback<TuneMethodsOutput>,
    callback?: Callback<TuneMethodsOutput>,
  ): Promise<TuneMethodsOutput> | void {
    return handle(
      {
        optionsOrCallback,
        callback,
      },
      async ({ options }) => {
        const { results } = await this.#fetcher<ApiTypes.TuneMethodsOutput>({
          ...options,
          method: 'GET',
          url: `/v1/tune_methods`,
        });
        return results;
      },
    );
  }

  promptTemplate(
    input: StrictUnion<PromptTemplateInput | PromptTemplateUpdateInput>,
    callback: Callback<PromptTemplateOutput>,
  ): void;
  promptTemplate(
    input: StrictUnion<PromptTemplateInput | PromptTemplateUpdateInput>,
    options: PromptTemplateOptions,
    callback: Callback<PromptTemplateOutput>,
  ): void;
  promptTemplate(
    input: StrictUnion<
      | PromptTemplateInput
      | PromptTemplateCreateInput
      | PromptTemplateUpdateInput
    >,
    options?: PromptTemplateOptions,
  ): Promise<PromptTemplateOutput>;
  promptTemplate(
    input: PromptTemplateInput,
    options: PromptTemplateDeleteOptions,
  ): Promise<PromptTemplateDeleteOutput>;
  promptTemplate(
    input: PromptTemplateInput,
    options: PromptTemplateDeleteOptions,
    callback: Callback<PromptTemplateDeleteOutput>,
  ): void;
  promptTemplate(
    input: PromptTemplateCreateInput,
    callback: Callback<PromptTemplateOutput>,
  ): void;
  promptTemplate(
    input: StrictUnion<
      | PromptTemplateCreateInput
      | PromptTemplateInput
      | PromptTemplateUpdateInput
    >,
    optionsOrCallback?:
      | PromptTemplateDeleteOptions
      | PromptTemplateOptions
      | Callback<PromptTemplateOutput>
      | Callback<PromptTemplateDeleteOutput>,
    callback?:
      | Callback<PromptTemplateOutput>
      | Callback<PromptTemplateDeleteOutput>,
  ): Promise<PromptTemplateOutput | PromptTemplateDeleteOutput> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const isCreateInput = isTypeOf<PromptTemplateCreateInput>(
        input,
        !('id' in input),
      );
      if (isCreateInput) {
        const { results: result } = await this.#fetcher<
          ApiTypes.PromptTemplateOutput,
          ApiTypes.PromptTemplateCreateInput
        >(
          {
            ...options,
            method: 'POST',
            url: `/v1/prompt_templates`,
            data: input,
          },
          ApiTypes.PromptTemplateOutputSchema,
        );
        return result;
      }

      const endpoint = `/v1/prompt_templates/${encodeURIComponent(input.id)}`;
      const cacheKey = generateCacheKey(
        CacheDiscriminator.PROMPT_TEMPLATE,
        input.id,
      );
      const opts = options as PromptTemplateDeleteOptions | undefined;
      if (opts?.delete) {
        await this.#fetcher({
          ...options,
          method: 'DELETE',
          url: endpoint,
          cache: {
            update: {
              [cacheKey]: 'delete',
            },
          },
        });
        return;
      }

      const { id: _, ...body } = input;
      if (isTypeOf<ApiTypes.PromptTemplateUpdate>(body, !isEmptyObject(body))) {
        const { results: result } = await this.#fetcher<
          ApiTypes.PromptTemplateOutput,
          ApiTypes.PromptTemplateUpdate
        >(
          {
            ...options,
            method: 'PUT',
            url: endpoint,
            data: body,
            cache: {
              update: {
                [cacheKey]: 'delete',
              },
            },
          },
          ApiTypes.PromptTemplateOutputSchema,
        );
        return result;
      }

      const { results: result } = await this.#fetcher(
        {
          ...options,
          method: 'GET',
          url: endpoint,
          id: cacheKey,
        },
        ApiTypes.PromptTemplateOutputSchema,
      );
      return result;
    });
  }

  promptTemplates(callback: Callback<PromptTemplatesOutput>): void;
  promptTemplates(
    input: PromptTemplatesInput,
    callback: Callback<PromptTemplatesOutput>,
  ): void;
  promptTemplates(
    input: PromptTemplatesInput,
    options: HttpHandlerOptions,
    callback: Callback<PromptTemplatesOutput>,
  ): void;
  promptTemplates(
    input?: PromptTemplatesInput,
    options?: HttpHandlerOptions,
  ): AsyncGenerator<PromptTemplatesOutput>;
  promptTemplates(
    inputOrCallback?: PromptTemplatesInput | Callback<PromptTemplatesOutput>,
    optionsOrCallback?: HttpHandlerOptions | Callback<PromptTemplatesOutput>,
    callback?: Callback<PromptTemplatesOutput>,
  ): AsyncGenerator<PromptTemplatesOutput> | void {
    return handleGenerator<
      PromptTemplatesInput | Callback<PromptTemplatesOutput>,
      HttpHandlerOptions | Callback<PromptTemplatesOutput>,
      Callback<PromptTemplatesOutput>,
      PromptTemplatesOutput
    >(
      {
        inputOrOptionsOrCallback: inputOrCallback,
        optionsOrCallback,
        callback,
      },
      ({ input, options }) =>
        paginator(
          async (paginatorParams) =>
            this.#fetcher<ApiTypes.PromptTemplatesOutput>(
              {
                ...options,
                method: 'GET',
                url: `/v1/prompt_templates?${paginatorParams.toString()}`,
                cache: false,
              },
              ApiTypes.PromptTemplatesOutputSchema,
            ),
          {
            offset: input?.offset ?? undefined,
            count: input?.count ?? undefined,
          },
        ),
    );
  }

  promptTemplateExecute(
    input: PromptTemplateExecuteInput,
    options?: PromptTemplateExecuteOptions,
  ): Promise<PromptTemplateExecuteOutput>;
  promptTemplateExecute(
    input: PromptTemplateExecuteInput,
    options: PromptTemplateExecuteOptions,
    callback: Callback<PromptTemplateExecuteOutput>,
  ): void;
  promptTemplateExecute(
    input: PromptTemplateExecuteInput,
    callback: Callback<PromptTemplateExecuteOutput>,
  ): void;
  promptTemplateExecute(
    input: PromptTemplateExecuteInput,
    optionsOrCallback?:
      | PromptTemplateExecuteOptions
      | Callback<PromptTemplateExecuteOutput>,
    callback?: Callback<PromptTemplateExecuteOutput> | Callback<void>,
  ): Promise<PromptTemplateExecuteOutput> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const { results } = await this.#fetcher<
        ApiTypes.PromptTemplateExecuteOutput,
        ApiTypes.PromptTemplateExecuteInput
      >({
        ...options,
        method: 'POST',
        url: '/v1/prompt_templates/output',
        data: input,
      });
      return results;
    });
  }

  history(callback: Callback<HistoryOutput>): void;
  history(input: HistoryInput, callback: Callback<HistoryOutput>): void;
  history(
    input: HistoryInput,
    options: HistoryOptions,
    callback: Callback<HistoryOutput>,
  ): void;
  history(
    input?: HistoryInput,
    options?: HistoryOptions,
  ): AsyncGenerator<HistoryOutput>;
  history(
    inputOrCallback?: HistoryInput | Callback<HistoryOutput>,
    optionsOrCallback?: HistoryOptions | Callback<HistoryOutput>,
    callback?: Callback<HistoryOutput>,
  ): AsyncGenerator<HistoryOutput> | void {
    return handleGenerator<
      HistoryInput | Callback<HistoryOutput>,
      HistoryOptions | Callback<HistoryOutput>,
      Callback<HistoryOutput>,
      HistoryOutput
    >(
      {
        inputOrOptionsOrCallback: inputOrCallback,
        optionsOrCallback,
        callback,
      },
      ({ input, options }) => {
        const params = new URLSearchParams();
        if (input?.status) params.set('status', input.status);
        if (input?.origin) params.set('origin', input.origin);

        return paginator(
          (paginatorParams) =>
            this.#fetcher(
              {
                ...options,
                method: 'GET',
                url: `/v1/requests?${paginatorParams.toString()}`,
                cache: false,
              },
              ApiTypes.HistoryOutputSchema,
            ),
          {
            offset: input?.offset ?? undefined,
            count: input?.count ?? undefined,
            params,
          },
        );
      },
    );
  }

  files(callback: Callback<FilesOutput>): void;
  files(input: FilesInput, callback: Callback<FilesOutput>): void;
  files(
    input: FilesInput,
    options: HttpHandlerOptions,
    callback: Callback<FilesOutput>,
  ): void;
  files(
    input?: FilesInput,
    options?: HttpHandlerOptions,
  ): AsyncGenerator<FilesOutput>;
  files(
    inputOrCallback?: FilesInput | Callback<FilesOutput>,
    optionsOrCallback?: HttpHandlerOptions | Callback<FilesOutput>,
    callback?: Callback<FilesOutput>,
  ): AsyncGenerator<FilesOutput> | void {
    return handleGenerator<
      FilesInput | Callback<FilesOutput>,
      HttpHandlerOptions | Callback<FilesOutput>,
      Callback<FilesOutput>,
      FilesOutput
    >(
      {
        inputOrOptionsOrCallback: inputOrCallback,
        optionsOrCallback,
        callback,
      },
      ({ input, options }) =>
        paginator(
          async (paginatorParams) =>
            this.#fetcher(
              {
                ...options,
                method: 'GET',
                url: `/v1/files?${paginatorParams.toString()}`,
                cache: false,
              },
              ApiTypes.FilesOutputSchema,
            ),
          {
            offset: input?.offset ?? undefined,
            count: input?.count ?? undefined,
          },
        ),
    );
  }

  file(input: FileInput, callback: Callback<FileOutput>): void;
  file(
    input: FileInput,
    options: FileOptions,
    callback: Callback<FileOutput>,
  ): void;
  file(
    input: StrictUnion<FileInput | FileCreateInput>,
    options?: FileOptions,
  ): Promise<FileOutput>;
  file(input: FileInput, options: FileDeleteOptions): Promise<FileDeleteOutput>;
  file(
    input: FileInput,
    options: FileDeleteOptions,
    callback: Callback<FileDeleteOutput>,
  ): void;
  file(input: FileCreateInput, callback: Callback<FileOutput>): void;
  file(
    input: StrictUnion<FileCreateInput | FileInput>,
    optionsOrCallback?:
      | FileDeleteOptions
      | FileOptions
      | Callback<FileOutput>
      | Callback<FileDeleteOutput>,
    callback?: Callback<FileOutput> | Callback<FileDeleteOutput>,
  ): Promise<FileOutput | FileDeleteOutput> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const transformOutput = (apiOutput: ApiTypes.FileOutput['results']) => ({
        ...apiOutput,
        download: () =>
          this.#fetcher<IncomingMessage>({
            ...options,
            responseType: 'stream',
            method: 'GET',
            url: `/v1/files/${encodeURIComponent(apiOutput.id)}/content`,
            cache: false,
          }),
      });

      const isCreateInput = isTypeOf<FileCreateInput>(input, !('id' in input));
      if (isCreateInput) {
        const { purpose, filename, file } = input;
        const formData = new FormData();
        formData.append('purpose', purpose);
        formData.append('file', file, { filename });
        const { results: result } = await this.#fetcher<
          ApiTypes.FileOutput,
          ApiTypes.FileCreateInput
        >(
          {
            ...options,
            method: 'POST',
            url: `/v1/files`,
            data: formData,
          },
          ApiTypes.FileOutputSchema,
        );
        return transformOutput(result);
      }

      const endpoint = `/v1/files/${encodeURIComponent(input.id)}`;
      const cacheKey = generateCacheKey(CacheDiscriminator.FILE, input.id);
      const opts = options as FileDeleteOptions | undefined;
      if (opts?.delete) {
        await this.#fetcher({
          ...options,
          method: 'DELETE',
          url: endpoint,
          cache: {
            update: {
              [cacheKey]: 'delete',
            },
          },
        });
        return;
      }

      const { results: result } = await this.#fetcher(
        {
          ...options,
          method: 'GET',
          url: endpoint,
          id: cacheKey,
        },
        ApiTypes.FileOutputSchema,
      );
      return transformOutput(result);
    });
  }
}

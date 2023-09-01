import { FetchService } from './FetchService.js';
import { ConfigService } from './ConfigService.js';
import { BaseService } from './BaseService.js';
import {
  GenerateInput,
  GenerateLimitsInput,
  GenerateLimitsOutput,
  GenerateOutput,
  HttpHandlerNoStreamOptions,
  HttpHandlerOptions,
} from '../client/types.js';
import { handle, parseFunctionOverloads, wait } from '../helpers/common.js';
import * as ApiTypes from '../api-types.js';
import { TypedReadable } from '../utils/stream.js';
import {
  errorTransformer,
  HttpError,
  InternalError,
  InvalidInputError,
} from '../errors.js';
import { Transform, TransformCallback } from 'stream';
import { AxiosError } from 'axios';
import type { DataCallback, ErrorCallback, Callback } from '../client/types.js';

export class GenerateService extends BaseService {
  public readonly config: ConfigService;

  constructor(fetcher: FetchService) {
    super(fetcher);
    this.config = this.createConfigService();
  }

  protected createConfigService(): ConfigService {
    return new ConfigService(this.fetcher);
  }

  #getTimeoutFactory(options?: HttpHandlerOptions) {
    const start = Date.now();
    const timeout = options?.timeout ?? this.fetcher.client.defaults.timeout;

    return () =>
      Math.max(0, timeout ? timeout - (Date.now() - start) : Infinity);
  }

  generateStream(
    input: GenerateInput,
    options: HttpHandlerOptions,
    callback: Callback<GenerateOutput | null>,
  ): void;
  generateStream(
    input: GenerateInput,
    callback: Callback<GenerateOutput | null>,
  ): void;
  generateStream(
    input: GenerateInput,
    options?: HttpHandlerOptions,
  ): TypedReadable<GenerateOutput>;
  generateStream(
    input: GenerateInput,
    optionsOrCallback?: HttpHandlerOptions | Callback<GenerateOutput | null>,
    callbackOrNothing?: Callback<GenerateOutput | null>,
  ): TypedReadable<GenerateOutput> | Promise<GenerateOutput> | void {
    const { callback, options } = parseFunctionOverloads(
      undefined,
      optionsOrCallback,
      callbackOrNothing,
    );

    if (Array.isArray(input)) {
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

    const getTimeout = this.#getTimeoutFactory(options);

    const { input: inputText, ...inputProps } = input;
    this.fetcher
      .fetch<ApiTypes.GenerateOutput, ApiTypes.GenerateInput>({
        ...options,
        method: 'POST',
        url: '/v1/generate',
        data: {
          ...inputProps,
          inputs: [inputText],
          use_default: !input.prompt_id,
          parameters: {
            ...input.parameters,
            stream: true,
          },
        },
        timeout: getTimeout(),
        stream: true,
      })
      .on('error', (err: Error) => stream.emit('error', errorTransformer(err)))
      .pipe(stream);

    if (!callback) {
      return stream;
    }

    stream.on('data', (data) => callback(null, data));
    stream.on('error', (err) => (callback as ErrorCallback)(err));
    stream.on('finish', () =>
      (callback as DataCallback<GenerateOutput | null>)(null, null),
    );
  }

  generate(input: GenerateInput, callback: Callback<GenerateOutput>): void;
  generate(input: GenerateInput[], callback: Callback<GenerateOutput>): void;
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
    optionsOrCallback?: HttpHandlerNoStreamOptions | Callback<GenerateOutput>,
    callbackOrNothing?: Callback<GenerateOutput>,
  ): Promise<GenerateOutput> | Promise<GenerateOutput>[] | void {
    const { callback, options } = parseFunctionOverloads(
      undefined,
      optionsOrCallback,
      callbackOrNothing,
    );

    // Normalize inputs
    const inputs = !Array.isArray(input) ? [input] : input;

    // Token calculation is considered public API
    const tokenCounts = inputs.map(() => 1);
    const getTimeout = this.#getTimeoutFactory(options);

    const promises = inputs.map(
      async ({ input: inputText, ...inputParams }, index, arr) => {
        try {
          // Retry on concurrency limit error
          while (getTimeout() > 0) {
            // Cached limits preflight
            const limits = await this.limits(undefined, {
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
                const { results } = await this.fetcher.fetch<
                  ApiTypes.GenerateOutput,
                  ApiTypes.GenerateInput
                >({
                  ...options,
                  method: 'POST',
                  url: '/v1/generate',
                  data: {
                    ...inputParams,
                    inputs: [inputText],
                    use_default: !inputParams.prompt_id,
                    parameters: {
                      ...inputParams.parameters,
                      stream: false,
                    },
                  },
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
      },
    );

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

  limits(
    input?: GenerateLimitsInput,
    options?: HttpHandlerOptions,
  ): Promise<GenerateLimitsOutput>;
  limits(callback: Callback<GenerateLimitsOutput>): void;
  limits(
    input: GenerateLimitsInput,
    callback: Callback<GenerateLimitsOutput>,
  ): void;
  limits(
    input: GenerateLimitsInput,
    options: HttpHandlerOptions,
    callback: Callback<GenerateLimitsOutput>,
  ): void;
  limits(
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
        this.fetcher.fetch<ApiTypes.GenerateLimitsOutput>({
          ...options,
          method: 'GET',
          url: '/v1/generate/limits',
          cache: {
            ttl: 1_000,
          },
        }),
    );
  }
}

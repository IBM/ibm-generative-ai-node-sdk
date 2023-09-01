import { BaseService } from './BaseService.js';
import {
  Callback,
  HttpHandlerOptions,
  TuneAssetType,
  TuneCreateInput,
  TuneCreateOptions,
  TuneInput,
  TuneMethodsInput,
  TuneMethodsOutput,
  TuneOptions,
  TuneOutput,
  TunesInput,
  TunesOutput,
} from '../client/types.js';
import {
  handle,
  handleGenerator,
  isTypeOf,
  paginator,
} from '../helpers/common.js';
import * as ApiTypes from '../api-types.js';
import { CacheDiscriminator, generateCacheKey } from '../client/cache.js';
import { IncomingMessage } from 'node:http';

export class TuneService extends BaseService {
  remove(input: TuneInput, callback: Callback<void>): void;
  remove(
    input: TuneInput,
    options: TuneOptions,
    callback: Callback<void>,
  ): void;
  remove(input: TuneInput, options?: TuneOptions): Promise<void>;
  remove(
    input: TuneInput,
    optionsOrCallback?: TuneOptions | Callback<void>,
    callback?: Callback<void>,
  ): Promise<void> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const cacheKey = generateCacheKey(CacheDiscriminator.TUNE, input.id);
      await this.fetcher.fetch({
        ...options,
        method: 'DELETE',
        url: `/v1/tunes/${encodeURIComponent(input.id)}`,
        cache: {
          update: {
            [cacheKey]: 'delete',
            [generateCacheKey(CacheDiscriminator.MODEL, input.id)]: 'delete',
            [generateCacheKey(CacheDiscriminator.MODELS)]: 'delete',
          },
        },
      });
    });
  }

  create(input: TuneCreateInput, options?: TuneOptions): Promise<TuneOutput>;
  create(
    input: TuneCreateInput,
    options: TuneCreateOptions,
    callback: Callback<TuneOutput>,
  ): void;
  create(
    input: TuneCreateInput,
    options: TuneCreateOptions,
    callback: Callback<void>,
  ): void;
  create(input: TuneCreateInput, callback: Callback<TuneOutput>): void;
  create(
    input: TuneCreateInput,
    optionsOrCallback?: TuneCreateOptions | Callback<TuneOutput>,
    callback?: Callback<TuneOutput>,
  ): Promise<TuneOutput> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const apiOutput = await this.fetcher.fetch<
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
      return this.#postProcess(apiOutput, options);
    });
  }

  get(input: TuneInput, options?: TuneOptions): Promise<TuneOutput>;
  get(
    input: TuneInput,
    options: TuneOptions,
    callback: Callback<TuneOutput>,
  ): void;
  get(input: TuneInput, options: TuneOptions, callback: Callback<void>): void;
  get(input: TuneInput, callback: Callback<TuneOutput>): void;
  get(
    input: TuneInput,
    optionsOrCallback?: TuneOptions | Callback<TuneOutput>,
    callback?: Callback<TuneOutput>,
  ): Promise<TuneOutput> | void {
    const cacheKey = generateCacheKey(CacheDiscriminator.TUNE, input.id);

    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const apiOutput = await this.fetcher.fetch<ApiTypes.TuneOutput>({
        ...options,
        method: 'GET',
        url: `/v1/tunes/${encodeURIComponent(input.id)}`,
        id: cacheKey,
      });
      return this.#postProcess(apiOutput, options);
    });
  }

  list(callback: Callback<TunesOutput>): void;
  list(input: TunesInput, callback: Callback<TunesOutput>): void;
  list(
    input: TunesInput,
    options: HttpHandlerOptions,
    callback: Callback<TunesOutput>,
  ): void;
  list(
    input?: TunesInput,
    options?: HttpHandlerOptions,
  ): AsyncGenerator<TunesOutput>;
  list(
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
            this.fetcher.fetch<ApiTypes.TunesOuput>({
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

  #postProcess(apiOutput: ApiTypes.TuneOutput, options?: HttpHandlerOptions) {
    const { status } = apiOutput.results;
    switch (status) {
      case 'COMPLETED':
        return {
          ...apiOutput.results,
          status,
          downloadAsset: async (type: TuneAssetType) =>
            this.fetcher.fetch<IncomingMessage>({
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
  }

  listMethods(callback: Callback<TuneMethodsOutput>): void;
  listMethods(
    input: TuneMethodsInput,
    callback: Callback<TuneMethodsOutput>,
  ): void;
  listMethods(
    input: TuneMethodsInput,
    options: HttpHandlerOptions,
    callback: Callback<TuneMethodsOutput>,
  ): void;
  listMethods(
    input?: TuneMethodsInput,
    options?: HttpHandlerOptions,
  ): Promise<TuneMethodsOutput>;
  listMethods(
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
        const { results } =
          await this.fetcher.fetch<ApiTypes.TuneMethodsOutput>({
            ...options,
            method: 'GET',
            url: `/v1/tune_methods`,
          });
        return results;
      },
    );
  }
}

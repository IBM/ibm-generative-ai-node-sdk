import {
  Callback,
  GenerateConfigInput,
  GenerateConfigOptions,
  GenerateConfigOutput,
  HttpHandlerOptions,
  ModelInput,
  ModelOutput,
} from '../client/types.js';
import { handle } from '../helpers/common.js';
import { CacheDiscriminator, generateCacheKey } from '../client/cache.js';
import * as ApiTypes from '../api-types.js';
import { BaseService } from './BaseService.js';

export class ConfigService extends BaseService {
  get(httpOptions?: GenerateConfigOptions): Promise<GenerateConfigOutput> {
    const cacheKey = generateCacheKey(CacheDiscriminator.GENERATE_CONFIG);

    return this.fetcher.fetch<ApiTypes.GenerateConfigOutput>({
      ...httpOptions,
      method: 'GET',
      url: '/v1/generate/config',
      id: cacheKey,
    });
  }

  reset(httpOptions?: HttpHandlerOptions) {
    const cacheKey = generateCacheKey(CacheDiscriminator.GENERATE_CONFIG);

    return this.fetcher.fetch<ApiTypes.GenerateConfigOutput>({
      ...httpOptions,
      method: 'DELETE',
      url: '/v1/generate/config',
      cache: {
        update: {
          [cacheKey]: 'delete',
        },
      },
    });
  }

  merge(input: GenerateConfigInput, httpOptions?: HttpHandlerOptions) {
    const cacheKey = generateCacheKey(CacheDiscriminator.GENERATE_CONFIG);

    return this.fetcher.fetch<
      ApiTypes.GenerateConfigOutput,
      ApiTypes.GenerateConfigInput
    >({
      ...httpOptions,
      method: 'PATCH',
      url: '/v1/generate/config',
      stream: false,
      data: input,
      cache: {
        update: {
          [cacheKey]: 'delete',
        },
      },
    });
  }

  replace(input: GenerateConfigInput, httpOptions?: HttpHandlerOptions) {
    const cacheKey = generateCacheKey(CacheDiscriminator.GENERATE_CONFIG);

    return this.fetcher.fetch<
      ApiTypes.GenerateConfigOutput,
      ApiTypes.GenerateConfigInput
    >({
      ...httpOptions,
      method: 'PUT',
      url: '/v1/generate/config',
      stream: false,
      data: input,
      cache: {
        update: {
          [cacheKey]: 'delete',
        },
      },
    });
  }

  remove(httpOptions?: HttpHandlerOptions) {
    const cacheKey = generateCacheKey(CacheDiscriminator.GENERATE_CONFIG);

    return this.fetcher.fetch<ApiTypes.GenerateConfigOutput>({
      ...httpOptions,
      method: 'DELETE',
      url: '/v1/generate/config',
      cache: {
        update: {
          [cacheKey]: 'delete',
        },
      },
    });
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
        const { results } = await this.fetcher.fetch<ApiTypes.ModelOutput>({
          ...options,
          method: 'GET',
          url: `/v1/models/${encodeURIComponent(input.id)}`,
          id: generateCacheKey(CacheDiscriminator.MODEL, input.id),
        });
        return results;
      },
    );
  }
}

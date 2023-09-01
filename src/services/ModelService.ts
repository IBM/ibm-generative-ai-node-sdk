import { BaseService } from './BaseService.js';
import {
  Callback,
  HttpHandlerOptions,
  ModelInput,
  ModelOutput,
  ModelsInput,
  ModelsOutput,
} from '../client/types.js';
import * as ApiTypes from '../api-types.js';
import { CacheDiscriminator, generateCacheKey } from '../client/cache.js';
import { handle } from '../helpers/common.js';

export class ModelService extends BaseService {
  get(input: ModelInput, options?: HttpHandlerOptions): Promise<ModelOutput>;
  get(
    input: ModelInput,
    options: HttpHandlerOptions,
    callback: Callback<ModelOutput>,
  ): void;
  get(input: ModelInput, callback: Callback<ModelOutput>): void;
  get(
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

  list(callback: Callback<ModelsOutput>): void;
  list(input: ModelsInput, callback: Callback<ModelsOutput>): void;
  list(
    input: ModelsInput,
    options: HttpHandlerOptions,
    callback: Callback<ModelsOutput>,
  ): void;
  list(
    input?: ModelsInput,
    options?: HttpHandlerOptions,
  ): Promise<ModelsOutput>;
  list(
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
        const { results } = await this.fetcher.fetch<ApiTypes.ModelsOutput>({
          ...options,
          method: 'GET',
          url: '/v1/models',
          id: generateCacheKey(CacheDiscriminator.MODELS),
        });
        return results;
      },
    );
  }
}

import {
  Callback,
  HttpHandlerOptions,
  PromptTemplateCreateInput,
  PromptTemplateDeleteOutput,
  PromptTemplateExecuteInput,
  PromptTemplateExecuteOptions,
  PromptTemplateExecuteOutput,
  PromptTemplateInput,
  PromptTemplateOptions,
  PromptTemplateOutput,
  PromptTemplatesInput,
  PromptTemplatesOutput,
  PromptTemplateUpdateInput,
} from '../client/types.js';
import { handle, handleGenerator, paginator } from '../helpers/common.js';
import { CacheDiscriminator, generateCacheKey } from '../client/cache.js';
import * as ApiTypes from '../api-types.js';
import { BaseService } from './BaseService.js';

export class PromptTemplatesService extends BaseService {
  #getEndpoint<T extends { id: string }>(input: T) {
    return `/v1/prompt_templates/${encodeURIComponent(input.id)}`;
  }

  #getCacheKey<T extends { id: string }>(input: T) {
    return generateCacheKey(CacheDiscriminator.PROMPT_TEMPLATE, input.id);
  }

  get(
    input: PromptTemplateInput,
    callback: Callback<PromptTemplateOutput>,
  ): void;
  get(
    input: PromptTemplateInput,
    options: PromptTemplateOptions,
    callback: Callback<PromptTemplateOutput>,
  ): void;
  get(
    input: PromptTemplateInput,
    options?: PromptTemplateOptions,
  ): Promise<PromptTemplateOutput>;
  get(
    input: PromptTemplateInput,
    optionsOrCallback?: PromptTemplateOptions | Callback<PromptTemplateOutput>,
    callback?: Callback<PromptTemplateOutput>,
  ): Promise<PromptTemplateOutput> | void {
    const endpoint = this.#getEndpoint(input);
    const cacheKey = this.#getCacheKey(input);

    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const { results: result } = await this.fetcher.fetch(
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

  create(
    input: PromptTemplateCreateInput,
    callback: Callback<PromptTemplateOutput>,
  ): void;
  create(
    input: PromptTemplateCreateInput,
    options: PromptTemplateOptions,
    callback: Callback<PromptTemplateOutput>,
  ): void;
  create(
    input: PromptTemplateCreateInput,
    options?: PromptTemplateOptions,
  ): Promise<PromptTemplateOutput>;
  create(
    input: PromptTemplateCreateInput,
    optionsOrCallback?: PromptTemplateOptions | Callback<PromptTemplateOutput>,
    callback?: Callback<PromptTemplateOutput>,
  ): Promise<PromptTemplateOutput> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const { results: result } = await this.fetcher.fetch<
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
    });
  }

  remove(
    input: PromptTemplateInput,
    callback: Callback<PromptTemplateDeleteOutput>,
  ): void;
  remove(
    input: PromptTemplateInput,
    options: PromptTemplateOptions,
    callback: Callback<PromptTemplateDeleteOutput>,
  ): void;
  remove(
    input: PromptTemplateInput,
    options?: PromptTemplateOptions,
  ): Promise<PromptTemplateDeleteOutput>;
  remove(
    input: PromptTemplateInput,
    optionsOrCallback?:
      | PromptTemplateOptions
      | Callback<PromptTemplateDeleteOutput>,
    callback?: Callback<PromptTemplateDeleteOutput>,
  ): Promise<PromptTemplateDeleteOutput> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const endpoint = this.#getEndpoint(input);
      const cacheKey = this.#getCacheKey(input);

      await this.fetcher.fetch({
        ...options,
        method: 'DELETE',
        url: endpoint,
        cache: {
          update: {
            [cacheKey]: 'delete',
          },
        },
      });
    });
  }

  update(
    input: PromptTemplateUpdateInput,
    callback: Callback<PromptTemplateOutput>,
  ): void;
  update(
    input: PromptTemplateUpdateInput,
    options: PromptTemplateOptions,
    callback: Callback<PromptTemplateOutput>,
  ): void;
  update(
    input: PromptTemplateUpdateInput,
    options?: PromptTemplateOptions,
  ): Promise<PromptTemplateOutput>;
  update(
    { id, ...body }: PromptTemplateUpdateInput,
    optionsOrCallback?: PromptTemplateOptions | Callback<PromptTemplateOutput>,
    callback?: Callback<PromptTemplateOutput>,
  ): Promise<PromptTemplateOutput> | void {
    const endpoint = this.#getEndpoint({ id });
    const cacheKey = this.#getCacheKey({ id });

    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const { results: result } = await this.fetcher.fetch<
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
    });
  }

  list(callback: Callback<PromptTemplatesOutput>): void;
  list(
    input: PromptTemplatesInput,
    callback: Callback<PromptTemplatesOutput>,
  ): void;
  list(
    input: PromptTemplatesInput,
    options: HttpHandlerOptions,
    callback: Callback<PromptTemplatesOutput>,
  ): void;
  list(
    input?: PromptTemplatesInput,
    options?: HttpHandlerOptions,
  ): AsyncGenerator<PromptTemplatesOutput>;
  list(
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
            this.fetcher.fetch<ApiTypes.PromptTemplatesOutput>(
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

  print(
    input: PromptTemplateExecuteInput,
    options?: PromptTemplateExecuteOptions,
  ): Promise<PromptTemplateExecuteOutput>;
  print(
    input: PromptTemplateExecuteInput,
    options: PromptTemplateExecuteOptions,
    callback: Callback<PromptTemplateExecuteOutput>,
  ): void;
  print(
    input: PromptTemplateExecuteInput,
    callback: Callback<PromptTemplateExecuteOutput>,
  ): void;
  print(
    input: PromptTemplateExecuteInput,
    optionsOrCallback?:
      | PromptTemplateExecuteOptions
      | Callback<PromptTemplateExecuteOutput>,
    callback?: Callback<PromptTemplateExecuteOutput> | Callback<void>,
  ): Promise<PromptTemplateExecuteOutput> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const { results } = await this.fetcher.fetch<
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
}

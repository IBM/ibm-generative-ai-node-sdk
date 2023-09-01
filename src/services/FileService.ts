import { BaseService } from './BaseService.js';
import {
  Callback,
  FileCreateInput,
  FileDeleteOutput,
  FileInput,
  FileOptions,
  FileOutput,
  FilesInput,
  FilesOutput,
  HttpHandlerOptions,
} from '../client/types.js';
import { handle, handleGenerator, paginator } from '../helpers/common.js';
import * as ApiTypes from '../api-types.js';
import { CacheDiscriminator, generateCacheKey } from '../client/cache.js';
import { IncomingMessage } from 'node:http';
import FormData from 'form-data';

export class FileService extends BaseService {
  list(callback: Callback<FilesOutput>): void;
  list(input: FilesInput, callback: Callback<FilesOutput>): void;
  list(
    input: FilesInput,
    options: HttpHandlerOptions,
    callback: Callback<FilesOutput>,
  ): void;
  list(
    input?: FilesInput,
    options?: HttpHandlerOptions,
  ): AsyncGenerator<FilesOutput>;
  list(
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
            this.fetcher.fetch(
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

  get(input: FileInput, callback: Callback<FileOutput>): void;
  get(
    input: FileInput,
    options: FileOptions,
    callback: Callback<FileOutput>,
  ): void;
  get(input: FileInput, options?: FileOptions): Promise<FileOutput>;
  get(
    input: FileInput,
    optionsOrCallback?: FileOptions | Callback<FileOutput>,
    callback?: Callback<FileOutput>,
  ): Promise<FileOutput> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const endpoint = `/v1/files/${encodeURIComponent(input.id)}`;
      const cacheKey = generateCacheKey(CacheDiscriminator.FILE, input.id);

      const { results: result } = await this.fetcher.fetch(
        {
          ...options,
          method: 'GET',
          url: endpoint,
          id: cacheKey,
        },
        ApiTypes.FileOutputSchema,
      );
      return this.#postProcess(result, options);
    });
  }

  #postProcess(
    apiOutput: ApiTypes.FileOutput['results'],
    options?: HttpHandlerOptions,
  ) {
    return {
      ...apiOutput,
      download: () =>
        this.fetcher.fetch<IncomingMessage>({
          ...options,
          responseType: 'stream',
          method: 'GET',
          url: `/v1/files/${encodeURIComponent(apiOutput.id)}/content`,
          cache: false,
        }),
    };
  }

  remove(input: FileInput, callback: Callback<FileOutput>): void;
  remove(
    input: FileInput,
    options: FileOptions,
    callback: Callback<FileDeleteOutput>,
  ): void;
  remove(input: FileInput, options?: FileOptions): Promise<FileDeleteOutput>;
  remove(
    input: FileInput,
    optionsOrCallback?: FileOptions | Callback<FileOutput>,
    callback?: Callback<FileOutput>,
  ): Promise<FileDeleteOutput> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const endpoint = `/v1/files/${encodeURIComponent(input.id)}`;
      const cacheKey = generateCacheKey(CacheDiscriminator.FILE, input.id);
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

  create(input: FileCreateInput, callback: Callback<FileOutput>): void;
  create(
    input: FileCreateInput,
    options: FileOptions,
    callback: Callback<FileOutput>,
  ): void;
  create(input: FileCreateInput, options?: FileOptions): Promise<FileOutput>;
  create(
    input: FileCreateInput,
    optionsOrCallback?: FileOptions | Callback<FileOutput>,
    callback?: Callback<FileOutput>,
  ): Promise<FileOutput> | void {
    return handle({ optionsOrCallback, callback }, async ({ options }) => {
      const { purpose, filename, file } = input;
      const formData = new FormData();
      formData.append('purpose', purpose);
      formData.append('file', file, { filename });
      const { results: result } = await this.fetcher.fetch<
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
      return this.#postProcess(result, options);
    });
  }
}

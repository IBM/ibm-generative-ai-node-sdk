import { Options } from '../client.js';
import { clientErrorWrapper } from '../utils/errors.js';
import {
  FileServiceCreateInput,
  FileServiceCreateOutput,
  FileServiceDeleteInput,
  FileServiceDeleteOutput,
  FileServiceListInput,
  FileServiceListOutput,
  FileServiceReadInput,
  FileServiceReadOutput,
  FileServiceRetrieveInput,
  FileServiceRetrieveOutput,
} from '../schema.js';

import { BaseService } from './BaseService.js';

export class FileService extends BaseService {
  async create(
    input: FileServiceCreateInput,
    opts?: Options,
  ): Promise<FileServiceCreateOutput> {
    return clientErrorWrapper(
      this._client.POST('/v2/files', {
        ...opts,
        body: { ...input, file: input.file.content }, // file is supplied just to avoid typecast
        bodySerializer(body) {
          const formData = new FormData();
          formData.append('purpose', body.purpose);
          formData.append('file', input.file.content, input.file.name);
          return formData;
        },
        params: {
          query: {
            version: '2023-12-15',
          },
        },
      }),
    );
  }

  async retrieve(
    input: FileServiceRetrieveInput,
    opts?: Options,
  ): Promise<FileServiceRetrieveOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/files/{id}', {
        ...opts,
        params: {
          path: input,
          query: {
            version: '2023-12-15',
          },
        },
      }),
    );
  }

  async read(
    input: FileServiceReadInput,
    opts?: Options,
  ): Promise<FileServiceReadOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/files/{id}/content', {
        ...opts,
        params: {
          path: input,
          query: {
            version: '2023-11-22',
          },
        },
        parseAs: 'blob',
      }),
    );
  }

  async delete(
    input: FileServiceDeleteInput,
    opts?: Options,
  ): Promise<FileServiceDeleteOutput> {
    return clientErrorWrapper(
      this._client.DELETE('/v2/files/{id}', {
        ...opts,
        params: {
          path: input,
          query: {
            version: '2023-11-22',
          },
        },
      }),
    );
  }

  async list(
    input: FileServiceListInput,
    opts?: Options,
  ): Promise<FileServiceListOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/files', {
        ...opts,
        params: {
          query: {
            ...input,
            version: '2023-12-15',
          },
        },
      }),
    );
  }
}

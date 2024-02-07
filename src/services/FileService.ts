import { Readable } from 'node:stream';

import { Options } from '../client.js';
import { clientErrorWrapper } from '../utils/errors.js';
import {
  FileServiceCreateInput,
  FileServiceCreateOutput,
  FileServiceDeleteInput,
  FileServiceDeleteOutput,
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
        body: input,
        bodySerializer(body) {
          const formData = new FormData();
          formData.append('purpose', body.purpose);
          formData.append('file', body.file, { body.filename });
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
        parseAs: 'stream',
      }),
    ) as unknown as Promise<Readable>;
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
}

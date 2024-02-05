import { clientErrorWrapper } from '../utils/errors.js';
import { Options } from '../client.js';
import {
  TuneServiceCreateInput,
  TuneServiceCreateOutput,
  TuneServiceDeleteInput,
  TuneServiceDeleteOutput,
  TuneServiceListInput,
  TuneServiceListOutput,
  TuneServiceReadInput,
  TuneServiceReadOutput,
  TuneServiceRetrieveInput,
  TuneServiceRetrieveOutput,
  TuneServiceTypesInput,
  TuneServiceTypesOutput,
} from '../schema.js';

import { BaseService } from './BaseService.js';

export class TuneService extends BaseService {
  async create(
    input: TuneServiceCreateInput,
    opts?: Options,
  ): Promise<TuneServiceCreateOutput> {
    return clientErrorWrapper(
      this._client.POST('/v2/tunes', {
        ...opts,
        params: { query: { version: '2023-11-22' } },
        body: input,
      }),
    );
  }

  async read(
    input: TuneServiceReadInput,
    opts?: Options,
  ): Promise<TuneServiceReadOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/tunes/{id}/content/{type}', {
        ...opts,
        params: { path: input, query: { version: '2023-12-15' } },
      }),
    );
  }

  async retrieve(
    input: TuneServiceRetrieveInput,
    opts?: Options,
  ): Promise<TuneServiceRetrieveOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/tunes/{id}', {
        ...opts,
        params: { path: input, query: { version: '2023-11-22' } },
      }),
    );
  }

  async delete(
    input: TuneServiceDeleteInput,
    opts?: Options,
  ): Promise<TuneServiceDeleteOutput> {
    return clientErrorWrapper(
      this._client.DELETE('/v2/tunes/{id}', {
        ...opts,
        params: { path: input, query: { version: '2023-11-22' } },
      }),
    );
  }

  async list(
    input: TuneServiceListInput,
    opts?: Options,
  ): Promise<TuneServiceListOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/tunes', {
        ...opts,
        params: { query: { ...input, version: '2023-11-22' } },
      }),
    );
  }

  async types(
    input: TuneServiceTypesInput,
    opts?: Options,
  ): Promise<TuneServiceTypesOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/tuning_types', {
        ...opts,
        params: { query: { version: '2023-11-22' } },
      }),
    );
  }
}

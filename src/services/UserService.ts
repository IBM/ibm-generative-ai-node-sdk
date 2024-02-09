import { Options } from '../client.js';
import { clientErrorWrapper } from '../utils/errors.js';
import {
  UserServiceCreateInput,
  UserServiceCreateOutput,
  UserServiceDeleteInput,
  UserServiceDeleteOutput,
  UserServiceRetrieveInput,
  UserServiceRetrieveOutput,
  UserServiceUpdateInput,
  UserServiceUpdateOutput,
} from '../schema.js';

import { BaseService } from './BaseService.js';

export class UserService extends BaseService {
  async create(
    input: UserServiceCreateInput,
    opts?: Options,
  ): Promise<UserServiceCreateOutput> {
    return clientErrorWrapper(
      this._client.POST('/v2/user', {
        ...opts,
        body: input,
        params: {
          query: {
            version: '2023-11-22',
          },
        },
      }),
    );
  }

  async retrieve(
    input: UserServiceRetrieveInput,
    opts?: Options,
  ): Promise<UserServiceRetrieveOutput> {
    return clientErrorWrapper(
      this._client.GET('/v2/user', {
        ...opts,
        params: {
          query: {
            version: '2023-11-22',
          },
        },
      }),
    );
  }

  async update(
    input: UserServiceUpdateInput,
    opts?: Options,
  ): Promise<UserServiceUpdateOutput> {
    return clientErrorWrapper(
      this._client.PATCH('/v2/user', {
        ...opts,
        params: {
          query: {
            version: '2023-11-22',
          },
        },
        body: input,
      }),
    );
  }

  async delete(
    input: UserServiceDeleteInput,
    opts?: Options,
  ): Promise<UserServiceDeleteOutput> {
    return clientErrorWrapper(
      this._client.DELETE('/v2/user', {
        ...opts,
        params: {
          query: {
            version: '2023-11-22',
          },
        },
      }),
    );
  }
}

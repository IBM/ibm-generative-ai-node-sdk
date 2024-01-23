import createClient, { FetchOptions, FetchResponse } from 'openapi-fetch';

import { FilterKeys } from '../utils/types.js';

import { components, paths } from './schema.js';

export type ApiClient = ReturnType<typeof createClient<paths>>;

export function createApiClient(
  ...params: Parameters<typeof createClient<paths>>
): ApiClient {
  return createClient<paths>(...params);
}

export type ApiClientOptions<
  Method extends keyof ApiClient,
  Path extends Parameters<ApiClient[Method]>[0],
> = FetchOptions<FilterKeys<paths[Path], Lowercase<Method>>>;

export type ApiClientResponse<
  Method extends keyof ApiClient,
  Path extends Parameters<ApiClient[Method]>[0] = Parameters<
    ApiClient[Method]
  >[0],
> = FetchResponse<FilterKeys<paths[Path], Lowercase<Method>>>;

export type ApiError = components['schemas']['BaseErrorResponse'];

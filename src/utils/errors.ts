import { FetchResponse } from 'openapi-fetch';

import {
  HttpError,
  InternalError,
  NetworkError,
  AbortError,
} from '../errors.js';

export function isAbortError(err: unknown): err is DOMException {
  return Boolean(
    err &&
      err instanceof Error &&
      (err.name === 'AbortError' ||
        err instanceof AbortError ||
        (err as any).code === 'ABORT_ERR'),
  );
}

const ServiceUnavailableErrorCodes = new Set([
  'ENOTFOUND',
  'ETIMEDOUT',
  'ECONNRESET',
  'EHOSTDOWN',
  'ECONNREFUSED',
  'ENETUNREACH', // macOS
  'EHOSTUNREACH', // Linux
  'UND_ERR_CONNECT_TIMEOUT',
  'EAI_AGAIN',
]);
function isServiceError(err: unknown) {
  const code = (err as any)?.code;
  return !!code && ServiceUnavailableErrorCodes.has(code);
}

export async function clientErrorWrapper<T>(
  request: Promise<FetchResponse<T>>,
): Promise<Exclude<FetchResponse<T>, { data?: never }>['data']> {
  try {
    const response = await request;
    if (response.error != undefined) {
      throw new HttpError(
        response.error as Exclude<typeof response.error, object>,
      );
    }
    return response.data!;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (isAbortError(err)) throw err;
    if (isServiceError(err))
      throw new NetworkError('Unable to connect', { cause: err });
    throw new InternalError('Request failed', { cause: err });
  }
}

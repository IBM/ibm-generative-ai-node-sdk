import { FetchResponse } from 'openapi-fetch';

import { HttpError, InternalError, NetworkError } from '../errors.js';

function isAbortError(err: unknown): err is DOMException {
  return Boolean(err && err instanceof Error && err.name === 'AbortError');
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
]);
function isServiceError(err: unknown) {
  const code = (err as any)?.code;
  return !!code && ServiceUnavailableErrorCodes.has(code);
}

export async function clientErrorWrapper<T>(
  request: Promise<FetchResponse<T>>,
) {
  try {
    const { data, error } = await request;
    if (error) throw new HttpError(error as Exclude<typeof error, object>);
    return data;
  } catch (err) {
    if (err instanceof HttpError) throw err;
    if (isAbortError(err)) throw err;
    if (isServiceError(err))
      throw new NetworkError('Unable to connect', { cause: err });
    throw new InternalError('Request failed', { cause: err });
  }
}

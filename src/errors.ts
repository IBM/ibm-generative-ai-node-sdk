import { AbortError as _AbortError } from 'p-queue-compat';

import type { ApiError } from './api/client.js';

export class BaseError extends Error {}

export class InvalidInputError extends BaseError {}

export class InternalError extends BaseError {}

export abstract class RequestError extends BaseError {}

export class NetworkError extends RequestError {}

export class HttpError extends RequestError implements ApiError {
  readonly error: ApiError['error'];
  readonly status_code: ApiError['status_code'];
  readonly extensions: ApiError['extensions'];

  constructor(error: ApiError) {
    super(error.message, { cause: error });
    this.error = error.error;
    this.status_code = error.status_code;
    this.extensions = error.extensions;
  }
}

// cjs compilation bug
export const AbortError: typeof _AbortError = _AbortError
  ? _AbortError
  : class AbortError extends Error {};

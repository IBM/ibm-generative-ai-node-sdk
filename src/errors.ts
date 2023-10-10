import { IncomingHttpHeaders } from 'node:http';

import {
  AxiosHeaders,
  AxiosResponse,
  HttpStatusCode,
  isAxiosError,
  isCancel as isAxiosCancel,
} from 'axios';

import { ErrorExtensions, ErrorResponse } from './api-types.js';

export class BaseError extends Error {}

export class InvalidInputError extends BaseError {}

export class InternalError extends BaseError {}

export class RequestError extends BaseError {
  code?: string;
  cancelled: boolean;

  constructor(
    message?: string,
    code?: string,
    cancelled = false,
    options?: ErrorOptions,
  ) {
    super(message, options);

    this.name = new.target.name;
    this.code = code;
    this.cancelled = cancelled;
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

export class RequestCanceledError extends RequestError {
  constructor(message?: string, code?: string, options?: ErrorOptions) {
    super(message, code, true, options);
  }
}

export class HttpError extends RequestError {
  statusCode: number;
  extensions?: ErrorExtensions;
  response: ErrorResponse;
  headers: IncomingHttpHeaders;

  constructor(
    message: string,
    statusText: string,
    statusCode: number,
    extensions: ErrorExtensions | undefined,
    response: ErrorResponse,
    headers: IncomingHttpHeaders,
    options?: ErrorOptions,
  ) {
    super(message, 'ERR_NON_2XX_3XX_RESPONSE', false, options);
    this.statusCode = statusCode;
    this.extensions = extensions;
    this.response = response;
    this.headers = headers;
  }
}

function isAbortError(err: unknown): err is DOMException {
  return Boolean(err && err instanceof Error && err.name === 'AbortError');
}

export function errorTransformer(err: unknown) {
  if (isAbortError(err)) {
    return new RequestCanceledError(
      err.message,
      String(err.cause ?? err.name),
      {
        cause: err,
      },
    );
  }

  if (!isAxiosError(err)) {
    return err;
  }

  if (err.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    const response = err.response as AxiosResponse<ErrorResponse>;

    return new HttpError(
      response.data.message,
      response.statusText,
      response.status,
      response.data.extensions,
      response.data,
      (response.headers instanceof AxiosHeaders
        ? response.headers.toJSON()
        : // There's some inconsistency between node headers and axios headers types (and only types because we are not in the browser)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          response.headers) as any,
      { cause: err },
    );
  }

  if (isAxiosCancel(err as unknown)) {
    return new RequestCanceledError(err.message, err.code, { cause: err });
  }
  return new RequestError(err.message, err.code, false, { cause: err });
}

export function isRetrievableError(error: unknown): boolean {
  if (error instanceof HttpError) {
    return [
      // Client errors
      HttpStatusCode.RequestTimeout,
      HttpStatusCode.TooManyRequests,
      // Server errors
      HttpStatusCode.InternalServerError,
      HttpStatusCode.BadGateway,
      HttpStatusCode.ServiceUnavailable,
      HttpStatusCode.GatewayTimeout,
      HttpStatusCode.InsufficientStorage,
    ].includes(error.statusCode);
  }
  if (error instanceof RequestError) {
    return !error.cancelled;
  }
  return false;
}

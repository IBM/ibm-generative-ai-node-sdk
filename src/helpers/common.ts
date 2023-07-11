import { z } from 'zod';
import { callbackify } from 'node:util';
import { URLSearchParams } from 'node:url';

export type FalsyValues = false | '' | 0 | null | undefined;
export type Truthy<T> = T extends FalsyValues ? never : T;

export function isTruthy<T>(value: T): value is Truthy<T> {
  return Boolean(value);
}

export function concatUnique<T>(
  ...arrays: Array<Array<T> | undefined | null>
): T[] {
  const merged = arrays.filter(isTruthy).flat();
  return Array.from(new Set(merged).values());
}

export function isNotEmptyArray<T>(arr: T[]): arr is [T, ...T[]] {
  return Array.isArray(arr) && arr.length > 0;
}

export async function wait(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

export type AnyFn = (...args: any[]) => any;
export function isFunction<T extends AnyFn = AnyFn>(
  value: unknown,
): value is T {
  return z.function().safeParse(value).success;
}

export function safeParseJson<T = any>(value: unknown): T | null {
  try {
    return JSON.parse(typeof value === 'string' ? value : String(value));
  } catch {
    return null;
  }
}

export type Unwrap<T> = T extends Array<infer P> ? P : T;

export function parseFunctionOverloads<A, B, C extends AnyFn>(
  inputOrOptionsOrCallback?: A | B | C,
  optionsOrCallback?: B | C,
  callback?: C,
): {
  input?: Exclude<A, B | C>;
  options?: Exclude<B, C>;
  callback?: C;
} {
  if (isFunction(inputOrOptionsOrCallback)) {
    return { callback: inputOrOptionsOrCallback };
  }

  const input = inputOrOptionsOrCallback as A;
  const options = isFunction(optionsOrCallback) ? undefined : optionsOrCallback;
  const cb = isFunction(optionsOrCallback) ? optionsOrCallback : callback;

  return {
    input: input as Exclude<A, B | C>,
    options: options as Exclude<B, C>,
    callback: cb as C,
  };
}

export function handle<A, B, C extends AnyFn, R>(
  params: {
    inputOrOptionsOrCallback?: A | B | C;
    optionsOrCallback?: B | C;
    callback?: C;
  },
  executor: (params: {
    input?: Exclude<A, B | C>;
    options?: Exclude<B, C>;
  }) => Promise<R>,
) {
  const { input, options, callback } = parseFunctionOverloads<A, B, C>(
    params.inputOrOptionsOrCallback,
    params.optionsOrCallback,
    params.callback,
  );

  const executorWrapper = () =>
    executor({
      input,
      options,
    });

  if (callback) {
    return callbackify(executorWrapper)(callback);
  }
  return executorWrapper();
}

export function handleGenerator<A, B, C extends AnyFn, R>(
  params: {
    inputOrOptionsOrCallback?: A | B | C;
    optionsOrCallback?: B | C;
    callback?: C;
  },
  executor: (params: {
    input?: Exclude<A, B | C>;
    options?: Exclude<B, C>;
  }) => AsyncGenerator<R>,
) {
  const { input, options, callback } = parseFunctionOverloads<A, B, C>(
    params.inputOrOptionsOrCallback,
    params.optionsOrCallback,
    params.callback,
  );

  const executorWrapper = () =>
    executor({
      input,
      options,
    });

  if (callback) {
    return callbackifyGenerator(executorWrapper)(callback);
  }
  return executorWrapper();
}

export function isTypeOf<T>(
  value: unknown | undefined,
  result: boolean,
): value is T {
  return result;
}

export function isNullish<T>(
  value: T | null | undefined,
): value is null | undefined {
  return value === null || value === undefined;
}

export function callbackifyGenerator<T>(generatorFn: () => AsyncGenerator<T>) {
  return (callback: AnyFn) => {
    (async () => {
      try {
        for await (const result of generatorFn()) {
          callback(null, result);
        }
      } catch (err) {
        callback(err);
      }
    })();
  };
}

export async function* paginator<T>(
  executor: (searchParams: URLSearchParams) => Promise<{
    results: T[];
    totalCount: number;
  }>,
  {
    offset = 0,
    count = Infinity,
    params,
    limit = 100,
  }: {
    offset?: number;
    count?: number;
    params?: URLSearchParams;
    limit?: number;
  },
): AsyncGenerator<T> {
  let currentOffset = offset;
  let remainingCount = count;
  let totalCount = Infinity;
  while (currentOffset < totalCount) {
    const paginatedSearchParams = new URLSearchParams(params);
    paginatedSearchParams.set('offset', currentOffset.toString());
    paginatedSearchParams.set(
      'limit',
      Math.min(remainingCount, limit).toString(),
    );
    const output = await executor(paginatedSearchParams);
    for (const result of output.results) {
      yield result;
      if (--remainingCount === 0) return;
      ++currentOffset;
    }
    totalCount = output.totalCount;
  }
}

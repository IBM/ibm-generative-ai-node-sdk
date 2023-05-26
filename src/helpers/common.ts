import { z } from 'zod';
import type { Callback } from '../client.js';
import { callbackify } from 'node:util';

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

export function respond<T>(executor: () => Promise<T>, cb?: Callback<T>) {
  return cb ? callbackify(executor)(cb) : executor();
}

export function parseFunctionOverloads<A, C extends AnyFn>(
  optionsOrCallback?: A | C,
  callback?: C,
) {
  const opts = isFunction(optionsOrCallback) ? undefined : optionsOrCallback;
  const cb = isFunction(optionsOrCallback) ? optionsOrCallback : callback;

  return {
    opts: opts as Exclude<A, AnyFn>,
    cb: cb as Exclude<C, Exclude<A, C>>,
  };
}

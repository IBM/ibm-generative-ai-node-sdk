const { default: PQueue } = await import('p-queue'); // Latest p-queue no longer supports CommonJS modules
import type { QueueAddOptions } from 'p-queue';

import { HttpError } from '../errors.js';

type Limiter = () => Promise<{ limit: number }>;
type Task<T> = () => Promise<T>;

function isConcurrencyLimitError(err: unknown): err is HttpError {
  return (
    err instanceof HttpError && err.extensions?.code === 'TOO_MANY_REQUESTS'
  );
}

export class ConcurrencyLimiter {
  private _queue?: typeof PQueue;
  private _limiterPromise?: ReturnType<Limiter>;

  constructor(private readonly limiter: Limiter) {}

  async execute<T>(task: Task<T>, options?: Partial<QueueAddOptions>) {
    await this._initQueue();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        return await this._queue!.add(task, {
          ...options,
          throwOnTimeout: true,
        });
      } catch (err) {
        if (isConcurrencyLimitError(err)) continue;
        throw err;
      }
    }
  }

  protected async _initQueue(): Promise<void> {
    if (this._queue) return;
    if (this._limiterPromise) {
      await this._limiterPromise;
      return;
    }

    this._limiterPromise = this.limiter();
    const { limit } = await this._limiterPromise;
    this._queue = new PQueue({ concurrency: limit });
  }
}

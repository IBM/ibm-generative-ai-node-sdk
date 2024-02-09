import PQueue, { QueueAddOptions } from 'p-queue';

import { HttpError } from '../errors.js';

type Limiter = () => Promise<{ limit: number }>;
type Task<T> = () => Promise<T>;

function isConcurrencyLimitError(err: unknown): err is HttpError {
  return (
    err instanceof HttpError && err.extensions?.code === 'TOO_MANY_REQUESTS'
  );
}

export class ConcurrencyLimiter {
  private _queue?: PQueue;

  constructor(private readonly limiter: Limiter) {}

  async execute<T>(task: Task<T>, options?: Partial<QueueAddOptions>) {
    if (!this._queue) this._queue = await this.createQueue();
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

  private async createQueue(): Promise<PQueue> {
    const { limit } = await this.limiter();
    return new PQueue({ concurrency: limit });
  }
}

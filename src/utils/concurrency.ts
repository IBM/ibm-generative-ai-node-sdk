import PQueue, { QueueAddOptions } from 'p-queue';

type Limiter = () => Promise<{ limit: number }>;
type Task<T> = () => Promise<T>;

export class ConcurrencyLimiter {
  private _queue?: PQueue;

  constructor(private readonly limiter: Limiter) {}

  async execute<T>(task: Task<T>, options?: Partial<QueueAddOptions>) {
    if (!this._queue) this._queue = await this.createQueue();
    return this._queue.add(task, { ...options, throwOnTimeout: true });
  }

  private async createQueue(): Promise<PQueue> {
    const { limit } = await this.limiter();
    return new PQueue({ concurrency: limit });
  }
}

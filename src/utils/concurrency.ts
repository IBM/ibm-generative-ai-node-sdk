import PQueue, { QueueAddOptions } from 'p-queue';

type Limiter = () => Promise<{ remaining: number }>;
type Task<T> = () => Promise<T>;

export class ConcurrencyLimiter {
  private readonly queue = new PQueue({ concurrency: 0 });
  private watcher?: NodeJS.Timeout;

  constructor(private readonly limiter: Limiter) {
    const updateLimit = async () => {
      try {
        const { remaining } = await limiter();
        this.queue.concurrency = remaining;
      } catch (err) {
        this.queue.concurrency = 0;
      }
    };
    // Polling is used to ensure that queue unblocks on outside factors
    const startWatching = () => {
      this.watcher = setInterval(updateLimit, 1000);
    };
    const stopWatching = () => {
      if (this.watcher) clearInterval(this.watcher);
    };
    this.queue.on('add', () => {
      if (this.queue.size === 1) startWatching();
    });
    this.queue.on('empty', stopWatching);
  }

  execute<T>(task: Task<T>, options?: Partial<QueueAddOptions>) {
    return this.queue.add(task, { ...options, throwOnTimeout: true });
  }
}

import { Readable } from 'stream';

export class TypedReadable<T> extends Readable {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _read(size: number) {
    /* empty */
  }

  addListener(event: 'close', listener: () => void): this;
  addListener(event: 'data', listener: (chunk: T) => void): this;
  addListener(event: 'end', listener: () => void): this;
  addListener(event: 'error', listener: (err: Error) => void): this;
  addListener(event: 'pause', listener: () => void): this;
  addListener(event: 'readable', listener: () => void): this;
  addListener(event: 'resume', listener: () => void): this;
  addListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this {
    return super.addListener(event, listener);
  }

  on(event: 'close', listener: () => void): this;
  on(event: 'data', listener: (chunk: T) => void): this;
  on(event: 'end', listener: () => void): this;
  on(event: 'error', listener: (err: Error) => void): this;
  on(event: 'pause', listener: () => void): this;
  on(event: 'readable', listener: () => void): this;
  on(event: 'resume', listener: () => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this {
    return super.on(event, listener);
  }

  [Symbol.asyncIterator](): AsyncIterableIterator<T> {
    return super[Symbol.asyncIterator]();
  }
}

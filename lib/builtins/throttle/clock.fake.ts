import { Clock } from './clock';

interface Waiter {
  at: number;
  resolve: () => void;
  reject: (error: Error) => void;
  cleanup: () => void;
}

/**
 * A controllable Clock for deterministic throttler tests: time only moves when
 * `advance` is called, which resolves any sleeps whose deadline has passed (in
 * deadline order, flushing microtasks between so code that re-sleeps is handled).
 */
export class FakeClock implements Clock {
  private current = 0;
  private waiters: Waiter[] = [];

  now(): number {
    return this.current;
  }

  sleep(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      if (signal?.aborted) {
        reject(abortError());
        return;
      }
      const waiter: Waiter = {
        at: this.current + ms,
        resolve,
        reject,
        cleanup: () => undefined,
      };
      const onAbort = (): void => {
        this.waiters = this.waiters.filter((w) => w !== waiter);
        reject(abortError());
      };
      waiter.cleanup = () => signal?.removeEventListener('abort', onAbort);
      signal?.addEventListener('abort', onAbort, { once: true });
      this.waiters.push(waiter);
    });
  }

  /** Move time forward by `ms`, resolving due sleeps (incl. ones that re-sleep). */
  async advance(ms: number): Promise<void> {
    const target = this.current + ms;
    for (;;) {
      const due = this.waiters
        .filter((w) => w.at <= target)
        .sort((a, b) => a.at - b.at)[0];
      if (!due) {
        break;
      }
      this.current = Math.max(this.current, due.at);
      this.waiters = this.waiters.filter((w) => w !== due);
      due.cleanup();
      due.resolve();
      await flushMicrotasks();
    }
    this.current = target;
  }

  /** Number of pending sleeps — lets a test assert something is parked. */
  get pending(): number {
    return this.waiters.length;
  }
}

function flushMicrotasks(): Promise<void> {
  return new Promise((resolve) => setImmediate(resolve));
}

function abortError(): Error {
  const error = new Error('aborted');
  error.name = 'AbortError';
  return error;
}

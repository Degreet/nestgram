/**
 * A counting semaphore: hands out a fixed number of permits and makes callers
 * wait once they run out. The concurrency primitive behind {@link UpdateQueue} —
 * `maxConcurrency` permits cap how many updates dispatch at once, and a caller
 * that can't get one waits (backpressure) instead of piling on.
 *
 * Fair (FIFO): waiters are served in arrival order, and a released permit is
 * handed directly to the next waiter rather than bouncing through the counter,
 * so a steady stream of waiters can't be starved by latecomers.
 */
export class Semaphore {
  private available: number;
  private readonly waiters: Array<() => void> = [];

  constructor(permits: number) {
    if (permits < 1) {
      throw new RangeError(`Semaphore needs at least 1 permit, got ${permits}`);
    }
    this.available = permits;
  }

  /**
   * Acquire a permit, waiting if none is free. Resolves with a `release` callback
   * — call it exactly once when done. `release` is idempotent-guarded so a
   * double-call can't leak extra permits.
   */
  acquire(): Promise<() => void> {
    if (this.available > 0) {
      this.available--;
      return Promise.resolve(this.releaseOnce());
    }
    return new Promise((resolve) => {
      this.waiters.push(() => resolve(this.releaseOnce()));
    });
  }

  /** Permits not currently held — exposed for tests/observability. */
  get free(): number {
    return this.available;
  }

  /** Callers waiting for a permit — exposed for tests/observability. */
  get waiting(): number {
    return this.waiters.length;
  }

  /**
   * A `release` bound to one acquisition: hand the permit straight to the next
   * waiter if there is one, otherwise return it to the pool. Guarded so calling
   * it twice is a no-op (can't release a permit we no longer hold).
   */
  private releaseOnce(): () => void {
    let released = false;
    return () => {
      if (released) {
        return;
      }
      released = true;
      const next = this.waiters.shift();
      if (next) {
        next();
      } else {
        this.available++;
      }
    };
  }
}

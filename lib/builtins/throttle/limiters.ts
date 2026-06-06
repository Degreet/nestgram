import { Clock } from './clock';

/**
 * Serialises `acquire` calls so they resolve in enqueue (FIFO) order: each waits
 * for the previous, preserving per-key message ordering. A rejected acquire
 * (aborted) doesn't break the chain for the next caller.
 */
abstract class SerialLimiter {
  private chain: Promise<void> = Promise.resolve();

  acquire(signal?: AbortSignal): Promise<void> {
    const result = this.chain.then(() => this.take(signal));
    this.chain = result.catch(() => undefined);
    return result;
  }

  protected abstract take(signal?: AbortSignal): Promise<void>;
}

/**
 * A refilling token bucket: up to `capacity` tokens, refilled continuously at
 * `rate` per `intervalMs`. Allows short bursts (what Telegram tolerates) while
 * holding the average rate. `pause` defers availability (for a 429 retry_after).
 */
export class TokenBucket extends SerialLimiter {
  private tokens: number;
  private lastRefill: number;
  private pausedUntil = 0;

  constructor(
    private readonly capacity: number,
    private readonly rate: number,
    private readonly intervalMs: number,
    private readonly clock: Clock,
  ) {
    super();
    this.tokens = capacity;
    this.lastRefill = clock.now();
  }

  pause(ms: number): void {
    this.pausedUntil = Math.max(this.pausedUntil, this.clock.now() + ms);
  }

  protected async take(signal?: AbortSignal): Promise<void> {
    for (;;) {
      const pauseLeft = this.pausedUntil - this.clock.now();
      if (pauseLeft > 0) {
        await this.clock.sleep(pauseLeft, signal);
        continue;
      }
      this.refill();
      if (this.tokens >= 1) {
        this.tokens -= 1;
        return;
      }
      const perToken = this.intervalMs / this.rate;
      await this.clock.sleep(
        Math.max(Math.ceil((1 - this.tokens) * perToken), 1),
        signal,
      );
    }
  }

  private refill(): void {
    const now = this.clock.now();
    const elapsed = now - this.lastRefill;
    if (elapsed <= 0) {
      return;
    }
    this.tokens = Math.min(
      this.capacity,
      this.tokens + (elapsed / this.intervalMs) * this.rate,
    );
    this.lastRefill = now;
  }
}

/**
 * Enforces a minimum gap between successive acquires (e.g. 1s per chat). Unlike a
 * token bucket it never lets two fire back-to-back at a boundary. `pause` extends
 * the next-allowed time (for a 429 retry_after).
 */
export class MinInterval extends SerialLimiter {
  private nextAllowed = 0;

  constructor(
    private readonly intervalMs: number,
    private readonly clock: Clock,
  ) {
    super();
  }

  pause(ms: number): void {
    this.nextAllowed = Math.max(this.nextAllowed, this.clock.now() + ms);
  }

  protected async take(signal?: AbortSignal): Promise<void> {
    for (;;) {
      const now = this.clock.now();
      if (now >= this.nextAllowed) {
        this.nextAllowed = now + this.intervalMs;
        return;
      }
      await this.clock.sleep(this.nextAllowed - now, signal);
    }
  }
}

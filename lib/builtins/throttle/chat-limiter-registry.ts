import { Clock } from './clock';
import { MinInterval, TokenBucket } from './limiters';
import { ResolvedThrottleOptions } from './throttle.types';

interface ChatLimiter {
  minInterval: MinInterval;
  /** Groups/channels also get a 20/min bucket; private chats don't. */
  groupBucket?: TokenBucket;
  lastUsed: number;
}

/**
 * Per-chat rate limiters, created lazily and evicted when idle so the map can't
 * grow without bound as new chats message the bot. The eviction timer lives in
 * the ThrottleInterceptor (one shared, unref'd interval calling `sweep`); this
 * class owns no timers, so it's pure and fully testable with a fake clock.
 */
export class ChatLimiterRegistry {
  private readonly limiters = new Map<string, ChatLimiter>();

  constructor(
    private readonly options: ResolvedThrottleOptions,
    private readonly clock: Clock,
  ) {}

  async acquire(chatId: number | string, signal?: AbortSignal): Promise<void> {
    const limiter = this.touch(chatId);
    await limiter.minInterval.acquire(signal);
    if (limiter.groupBucket) {
      await limiter.groupBucket.acquire(signal);
    }
  }

  pause(chatId: number | string, ms: number): void {
    const limiter = this.limiters.get(String(chatId));
    limiter?.minInterval.pause(ms);
    limiter?.groupBucket?.pause(ms);
  }

  /** Delete entries idle past `idleTtlMs`. Driven by the ThrottleInterceptor's sweeper. */
  sweep(): void {
    const cutoff = this.clock.now() - this.options.idleTtlMs;
    for (const [key, limiter] of this.limiters) {
      if (limiter.lastUsed <= cutoff) {
        this.limiters.delete(key);
      }
    }
  }

  get size(): number {
    return this.limiters.size;
  }

  /** Get-or-create the limiter for a chat, moving it to most-recently-used. */
  private touch(chatId: number | string): ChatLimiter {
    const key = String(chatId);
    const existing = this.limiters.get(key);
    if (existing) {
      existing.lastUsed = this.clock.now();
      // Re-insert so Map iteration order tracks LRU (oldest first).
      this.limiters.delete(key);
      this.limiters.set(key, existing);
      return existing;
    }

    if (this.limiters.size >= this.options.maxKeys) {
      this.evictOldest();
    }
    const created = this.create(chatId);
    this.limiters.set(key, created);
    return created;
  }

  private create(chatId: number | string): ChatLimiter {
    return {
      minInterval: new MinInterval(this.options.perChatIntervalMs, this.clock),
      groupBucket: this.isGroup(chatId)
        ? new TokenBucket(
            this.options.groupRate,
            this.options.groupRate,
            this.options.groupIntervalMs,
            this.clock,
          )
        : undefined,
      lastUsed: this.clock.now(),
    };
  }

  /** Negative ids are groups/channels; a non-numeric @username is treated as one. */
  private isGroup(chatId: number | string): boolean {
    if (typeof chatId === 'number') {
      return chatId < 0;
    }
    const numeric = Number(chatId);
    return Number.isNaN(numeric) ? true : numeric < 0;
  }

  private evictOldest(): void {
    const oldest = this.limiters.keys().next().value;
    if (oldest !== undefined) {
      this.limiters.delete(oldest);
    }
  }
}

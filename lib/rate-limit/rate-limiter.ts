import { Inject, Injectable, Optional } from '@nestjs/common';

import { Clock, CLOCK, SystemClock } from '../builtins/throttle/clock';
import type { KeyValueStore } from '../store/key-value-store';
import { RATE_LIMIT_STORE } from './rate-limit.types';

/** The persisted shape of one key's counter: the timestamps of recent hits. */
interface SlidingWindowEntry {
  hits: number[];
}

/**
 * Store-backed sliding-window counter, the heart of inbound flood control.
 *
 * Non-blocking: {@link hit} answers allow/deny immediately — it never waits for
 * a token to free (that is the outbound send-throttle's job, and the wrong
 * model here). On each call it loads the key's recent-hit timestamps, prunes
 * those older than the window, and allows iff the remaining count is below the
 * limit — a true sliding window, so it has none of a fixed window's
 * burst-at-boundary doubling.
 *
 * Persistence is a swappable {@link KeyValueStore}: the default {@link
 * MemoryStore} is process-local; a Redis-backed store makes the limit hold
 * across replicas. Read-modify-write is NOT atomic — the same guarantee
 * sessions and FSM already accept. Under concurrency several updates can read
 * the same pre-write count and all be allowed, so a key can briefly exceed its
 * limit by up to the in-flight count; acceptable for protective flood control,
 * and a non-issue for the largely-sequential per-batch processing of long
 * polling.
 *
 * Memory is bounded per key by the lazy prune (an entry never holds more than
 * `limit` timestamps); the only unbounded axis is the number of distinct keys
 * ever seen. The default store carries no time-based TTL on purpose: a TTL
 * shorter than a rule's window would evict a live counter and let a flood slip
 * through, and windows are per-rule and unknown to the store. For a
 * multi-instance deploy, or to evict keys that go idle, supply a Redis-backed
 * store whose native key TTL is ≳ the largest window.
 */
@Injectable()
export class RateLimiter {
  private readonly clock: Clock;

  constructor(
    @Inject(RATE_LIMIT_STORE) private readonly store: KeyValueStore,
    // Optional so the limiter never hard-depends on the throttle feature's
    // CLOCK provider. RateLimitModule provides a SystemClock in-scope; tests
    // construct the limiter directly with a fake clock.
    @Optional() @Inject(CLOCK) clock?: Clock,
  ) {
    this.clock = clock ?? new SystemClock();
  }

  /**
   * Record an attempt against `key` and report whether it is allowed. When
   * allowed, the hit is persisted; when denied, the window is left unchanged so
   * a flood can't keep pushing the window forward.
   */
  async hit(key: string, limit: number, windowMs: number): Promise<boolean> {
    const now = this.clock.now();
    const cutoff = now - windowMs;

    const entry = await this.load(key);
    const recent = entry.hits.filter((at) => at > cutoff);

    if (recent.length >= limit) {
      // Persist the prune so an idle-then-flooding key doesn't carry stale
      // timestamps forever, but don't add this denied hit to the window.
      if (recent.length !== entry.hits.length) {
        await this.store.set(key, {
          hits: recent,
        } satisfies SlidingWindowEntry);
      }
      return false;
    }

    recent.push(now);
    await this.store.set(key, { hits: recent } satisfies SlidingWindowEntry);
    return true;
  }

  private async load(key: string): Promise<SlidingWindowEntry> {
    const raw = await this.store.get(key);
    if (RateLimiter.isEntry(raw)) {
      return raw;
    }
    return { hits: [] };
  }

  private static isEntry(value: unknown): value is SlidingWindowEntry {
    return (
      typeof value === 'object' &&
      value !== null &&
      Array.isArray((value as SlidingWindowEntry).hits)
    );
  }
}

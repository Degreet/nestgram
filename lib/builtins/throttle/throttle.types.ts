/**
 * Tunable knobs for the {@link ThrottleInterceptor}. Telegram's limits are
 * unofficial and change, so every value is overridable via `throttle: { ... }`.
 */
export interface ThrottleOptions {
  /** Global allowance: `globalRate` sends per `globalIntervalMs` (default 30 / 1s). */
  globalRate?: number;
  globalIntervalMs?: number;
  /** Minimum gap between sends to one chat (default 1s). */
  perChatIntervalMs?: number;
  /** Per-group/channel allowance: `groupRate` per `groupIntervalMs` (default 20 / 60s). */
  groupRate?: number;
  groupIntervalMs?: number;
  /** Bounded 429 retries (default 3). */
  maxRetries?: number;
  /** Retry 429s at all (default true); set false to surface them immediately. */
  retry?: boolean;
  /** Extra wait added on top of `retry_after` before retrying (default 250ms). */
  retryBufferMs?: number;
  /** Wait used when a 429 omits `retry_after` (default 5s). */
  fallbackRetrySeconds?: number;
  /** Evict a per-chat limiter idle at least this long (default 5min). */
  idleTtlMs?: number;
  /** Hard cap on tracked chats; LRU-evict past it (default 10000). */
  maxKeys?: number;
  /** How often the idle sweeper runs (default 60s). */
  sweepIntervalMs?: number;
}

export type ResolvedThrottleOptions = Required<ThrottleOptions>;

/**
 * Named defaults — Telegram's documented (unofficial) limits plus sane retry and
 * eviction values. The single home for these numbers (no magic literals).
 */
export const THROTTLE_DEFAULTS: ResolvedThrottleOptions = {
  globalRate: 30,
  globalIntervalMs: 1000,
  perChatIntervalMs: 1000,
  groupRate: 20,
  groupIntervalMs: 60000,
  maxRetries: 3,
  retry: true,
  retryBufferMs: 250,
  fallbackRetrySeconds: 5,
  idleTtlMs: 300000,
  maxKeys: 10000,
  sweepIntervalMs: 60000,
};

/** Merge a `throttle` option onto the defaults. `true`/`false`/omitted → all defaults. */
export function resolveThrottleOptions(
  throttle?: boolean | ThrottleOptions,
): ResolvedThrottleOptions {
  if (typeof throttle !== 'object') {
    return { ...THROTTLE_DEFAULTS };
  }
  return { ...THROTTLE_DEFAULTS, ...throttle };
}

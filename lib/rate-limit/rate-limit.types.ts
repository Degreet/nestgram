import type { TelegramExecutionContext } from '../engine/context';
import type { KeyValueStore } from '../store/key-value-store';

/**
 * Computes the rate-limit scope key for an update. Default
 * {@link defaultConversationKey} (bot · chat · user · forum topic · business
 * connection). Return `undefined` to skip rate-limiting for this update — there
 * is nothing to scope the counter to.
 */
export type RateLimitKey = (
  ctx: TelegramExecutionContext,
) => string | undefined;

/**
 * Called when an update is dropped for exceeding its limit. If it returns a
 * value (e.g. a `string` or a `SendMessage`), that value is emitted as the
 * interceptor's result and flows through the normal reply path — so the user
 * can be warned. If it returns `undefined`/void, nothing is emitted (silent
 * drop). May be async (return a `Promise` — `unknown` already admits one).
 */
export type OnRateLimit = (ctx: TelegramExecutionContext) => unknown;

/**
 * A single rate-limit rule: at most `limit` updates per rolling `windowMs`.
 * Used both as the module-level default ({@link RateLimitOptions.default}) and
 * as the per-route override carried by `@RateLimit(...)`.
 */
export interface RateLimitRule {
  /** Max updates allowed within the window. */
  limit: number;
  /** Rolling window length in milliseconds. */
  windowMs: number;
  /** Per-route key override. Falls back to the module key, then the default. */
  key?: RateLimitKey;
  /** Per-route on-limit override. Falls back to the module callback. */
  onLimit?: OnRateLimit;
}

/**
 * Rate-limit configuration, passed to `RateLimitModule.forRoot`. Every field is
 * optional: with no `default` and no `@RateLimit` on a route, the interceptor
 * passes through (no limiting). The store and key strategy are swappable — no
 * privileged core.
 */
export interface RateLimitOptions {
  /**
   * The fallback rule applied to every route that has neither its own
   * `@RateLimit` nor `@SkipRateLimit`. Omit it to limit only the routes you
   * explicitly decorate.
   */
  default?: RateLimitRule;
  /**
   * Persistence for the counters. Default: a process-local {@link MemoryStore}
   * with no time-based TTL (see {@link RateLimiter} for why). Supply a
   * Redis-backed store for a multi-instance deploy or to evict idle keys; its
   * native key TTL should be ≳ the largest window.
   */
  store?: KeyValueStore;
  /**
   * Default key strategy for every rule that doesn't set its own `key`. Default
   * {@link defaultConversationKey}. Return `undefined` to skip an update.
   */
  key?: RateLimitKey;
  /**
   * Default on-limit callback for every rule that doesn't set its own
   * `onLimit`. Default: undefined (silent drop).
   */
  onLimit?: OnRateLimit;
}

/** DI token for the resolved rate-limit settings (provided by the module). */
export const RATE_LIMIT_OPTIONS = 'nestgram:rate-limit:options';

/** DI token for the {@link KeyValueStore} backing the counters. */
export const RATE_LIMIT_STORE = 'nestgram:rate-limit:store';

/** Reflect-metadata keys written by the rate-limit decorators. */
export enum RateLimitMetadata {
  /** A `@RateLimit(rule)` override on a handler or `@Router()` class. */
  RULE = 'nestgram:rate-limit:rule',
  /** A `@SkipRateLimit()` exemption on a handler or `@Router()` class. */
  SKIP = 'nestgram:rate-limit:skip',
}

import { ModuleMetadata, Type } from '@nestjs/common';

import { PollingOptions } from '../engine/source';
import type { ApiInterceptor } from '../api/request';
import type { ThrottleOptions } from '../builtins/throttle/throttle.types';
import type { SessionOptions } from '../sessions/session.types';
import type { I18nOptions } from '../i18n/i18n.types';

/**
 * Options for `NestgramModule.forRoot`.
 *
 * Note there is no `routers` list: routers are discovered from the Nest provider
 * graph (`@Router()` classes), so adding one never means editing the module too.
 */
/** Webhook transport configuration. */
export interface WebhookOptions {
  /** Public HTTPS URL Telegram should deliver updates to. */
  url: string;
  /**
   * Secret token sent as `X-Telegram-Bot-Api-Secret-Token` so the bot can
   * verify updates really come from Telegram. Strongly recommended.
   */
  secretToken?: string;
}

export interface NestgramModuleOptions {
  /** Bot API token. */
  token: string;
  /**
   * Long-polling transport. `true` uses defaults; pass an object to tune
   * offset/limit/timeout/etc. Omit to start the bot without a transport (e.g.
   * to drive the dispatcher yourself, or in tests). Webhook support lands in a
   * later phase via its own update source.
   */
  polling?: boolean | PollingOptions;
  /**
   * Webhook transport config. When set, the bot registers the webhook with
   * Telegram on boot and receives updates over HTTP instead of polling. You
   * register the receiver yourself (no privileged core): add the ready-made
   * `WebhookController` to a module's `controllers` (served at
   * `/telegram/webhook` — point `url` there), use `createWebhookController(path)`
   * for a custom route, or write your own controller and forward updates via
   * `WebhookUpdateSource`. Always set `secretToken` in production — without it,
   * anyone who learns the URL can spoof updates (the bot warns at startup).
   */
  webhook?: WebhookOptions;
  /**
   * Auto-answer callback queries a handler left unanswered, so buttons never
   * spin. On by default; set `false` to disable globally (or use
   * `@NoAutoAnswer()` per handler). A thrown error skips auto-answer.
   */
  autoAnswerCallbackQueries?: boolean;
  /**
   * Default `parse_mode` for outgoing sends. Applied when a call omits
   * `parse_mode`; pass `parse_mode` explicitly on a call to override, or
   * `parse_mode: undefined` to opt that call out.
   */
  parseMode?: string;
  /**
   * Enable persistent per-update sessions, reachable via `@Session()`. Presence
   * turns them on; the store and key strategy are swappable. Omit to keep
   * sessions off (`@Session()` then resolves to `undefined`).
   */
  session?: SessionOptions;
  /**
   * Enable i18n: per-locale message catalogs reachable via the free `t()` /
   * `locale()` helpers (and `@Locale()`). Presence turns it on; omit to keep it
   * off (then `t()` returns the key verbatim). The locale resolver is swappable.
   */
  i18n?: I18nOptions;
  /**
   * Extra outbound {@link ApiInterceptor}s — run after the built-ins (token
   * validation, default parse mode) and before the throttler, on every API call.
   * Same `intercept(context, next)` contract as a Nest handler interceptor; the
   * framework's own send-time behaviours are just interceptors, no privileged core.
   */
  apiInterceptors?: Type<ApiInterceptor>[];
  /**
   * Send rate-limiting (on by default — the production baseline): `true`/omitted
   * uses Telegram's limits, `false` turns it off, or pass an object to tune.
   */
  throttle?: boolean | ThrottleOptions;
  /** Replace the default throttler entirely (e.g. a Redis-backed distributed one). */
  throttler?: Type<ApiInterceptor>;
}

/** A class that can produce `NestgramModuleOptions` (for `useClass`/`useExisting`). */
export interface NestgramOptionsFactory {
  createNestgramOptions():
    | Promise<NestgramModuleOptions>
    | NestgramModuleOptions;
}

/**
 * Options for `NestgramModule.forRootAsync` — resolve the config from DI (e.g.
 * the token from `ConfigService`) instead of passing it literally.
 */
export interface NestgramModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<NestgramOptionsFactory>;
  useClass?: Type<NestgramOptionsFactory>;
  useFactory?: (
    ...args: any[]
  ) => Promise<NestgramModuleOptions> | NestgramModuleOptions;
  /** Extra outbound API interceptors (static — not resolved via the factory). */
  apiInterceptors?: Type<ApiInterceptor>[];
  /** Replace the default throttler (static — not resolved via the factory). */
  throttler?: Type<ApiInterceptor>;
}

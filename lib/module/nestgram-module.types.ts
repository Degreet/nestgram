import { ModuleMetadata, Type } from '@nestjs/common';

import { PollingOptions } from '../engine/source';
import type { RequestTransformer } from '../api/request';

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
   * Webhook transport config. When set, the bot receives updates over HTTP via
   * the built-in controller (served at `/telegram/webhook` — point `url` there)
   * instead of polling. Always set `secretToken` in production — without it,
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
   * Extra outbound {@link RequestTransformer}s — run after the built-ins (token
   * validation, default parse mode) on every API call. The framework's own
   * send-time behaviours are just transformers; this is the same hook, no
   * privileged core.
   */
  transformers?: Type<RequestTransformer>[];
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
  /** Extra outbound request transformers (static — not resolved via the factory). */
  transformers?: Type<RequestTransformer>[];
}

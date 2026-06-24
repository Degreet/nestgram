import { ModuleMetadata, Type } from '@nestjs/common';

import { PollingOptions } from '../engine/source';
import type { UpdateSourceFactory } from '../engine/source';
import type { UpdateQueueOptions } from '../engine/queue';
import type { AllowedUpdate } from '../engine/context/update-kind';
import type { ApiInterceptor } from '../api/request';
import type { ParseModeValue } from '../api/parse-mode';
import type { RichMessagesOptions } from '../builtins/rich-messages/rich-messages.types';
import type { ThrottleOptions } from '../builtins/throttle/throttle.types';
import type { FileIdCacheOptions } from '../builtins/file-id-cache/file-id-cache.types';
import type { KeyboardStateOptions } from '../keyboards/state/keyboard-state.types';

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
  /**
   * Explicit `allowed_updates` for the webhook registration. Omit (recommended)
   * to derive the list from your handlers — that also requests the kinds
   * Telegram holds back by default (`chat_member`, `message_reaction`, …)
   * whenever a handler listens to them. With an explicit list, a handler for a
   * kind the list omits is dead — the bot warns about it at startup.
   */
  allowedUpdates?: AllowedUpdate[];
}

/**
 * One bot in a multi-bot app's `bots: []`. Carries that bot's token, transport,
 * and per-bot pipeline flags — each bot gets its OWN interceptor pipeline built
 * from these, so `parseMode`/`throttle`/… are configured independently. Inject a
 * specific bot with `@InjectBot('name')`; the current update's bot with `@Bot()`.
 */
export interface BotDefinition {
  /**
   * The bot's name — the key for `@InjectBot('name')` and `@ForBot('name')`.
   * Optional only when there is a single bot (it becomes the default); with more
   * than one bot, each needs a distinct name.
   */
  name?: string;
  /**
   * Make this the default bot: the one a bare `BotService` injection (and
   * `@InjectBot()` with no name) resolves to. At most one bot may set it. A
   * single bot is the default implicitly.
   */
  default?: boolean;
  /** Bot API token. */
  token: string;
  /** Long-polling transport for this bot (see {@link NestgramModuleOptions.polling}). */
  polling?: boolean | PollingOptions;
  /** Webhook transport for this bot — needs a distinct `url`/path per bot. */
  webhook?: WebhookOptions;
  /** Default `parse_mode` for this bot's sends. */
  parseMode?: ParseModeValue;
  /** Rich-message rewriting for this bot. */
  richMessages?: RichMessagesOptions;
  /** Swallow the `message is not modified` edit no-op for this bot. */
  ignoreNotModified?: boolean;
  /** Extra outbound API interceptors for this bot. */
  apiInterceptors?: Type<ApiInterceptor>[];
  /** Send rate-limiting for this bot. */
  throttle?: boolean | ThrottleOptions;
  /** Replace this bot's throttler entirely. */
  throttler?: Type<ApiInterceptor>;
  /** Configure this bot's `file_id` cache (store/TTL/key). See {@link FileIdCacheOptions}. */
  fileIdCache?: FileIdCacheOptions;
}

export interface NestgramModuleOptions {
  /**
   * Bot API token for the single (default) bot. Pass EITHER this (single-bot) OR
   * {@link NestgramModuleOptions.bots} (multi-bot), never both.
   */
  token?: string;
  /**
   * Run several bots from one app. Each entry is an independent bot with its own
   * token, transport, and pipeline flags. Resolved from the options object, so a
   * `forRootAsync` factory can build the list dynamically (e.g. from a database)
   * without knowing the count ahead of time. Mutually exclusive with `token`.
   */
  bots?: BotDefinition[];
  /**
   * Long-polling transport. `true` uses defaults; pass an object to tune
   * offset/limit/timeout/etc. Omit to start the bot without a transport (e.g.
   * to drive the dispatcher yourself, or in tests) — or set `webhook` to
   * receive updates over HTTP instead.
   */
  polling?: boolean | PollingOptions;
  /**
   * Plug in your own update source, or decorate the built-in one. Called once
   * per bot with `{ default, bot, get }` — return `ctx.default` wrapped in your
   * own `UpdateSource` decorator (e.g. a queue) to add a layer, or your own
   * `UpdateSource` to replace ingestion entirely (the `polling`/`webhook` config
   * then only seeds `ctx.default`, which you may ignore). Branch on `ctx.bot.name`
   * for per-bot behaviour. The public seam the framework's own queue layer is
   * built on — no privileged core.
   */
  source?: UpdateSourceFactory;
  /**
   * In-process update queue applied over the active source (per bot): per-chat
   * FIFO serialization plus a bounded concurrency cap. On by default (the
   * correctness baseline for a single-instance bot) — updates for the SAME chat
   * dispatch one at a time in arrival order, so two quick messages can't race on
   * that chat's session/FSM state, while different chats run in parallel up to
   * `maxConcurrency` (the poll loop paces itself to that bound). Pass an object
   * to tune, or `false` to dispatch every update immediately with no
   * serialization or bound (the pre-queue behaviour — reintroduces the race).
   * It wraps whatever `source` resolves to, so a custom source is queued too
   * unless you turn this off.
   */
  updateQueue?: UpdateQueueOptions | false;
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
   * Warn (in the log) when a `callback_query` matches no `@Action` route — a
   * dead button (pressing it does nothing). On by default; set `false` to
   * silence. The warning is itself a built-in `@OnUnhandled` handler, so you can
   * also add your own `@OnUnhandled` to log/handle unmatched updates differently.
   */
  warnUnhandledCallbacks?: boolean;
  /**
   * Map a thrown `ReplyException`/`AnswerException` to a Telegram reply or
   * callback answer via a built-in global `@Catch` filter — the framework's
   * `HttpException -> filter` idiom. On by default (a thrown `ReplyException`
   * does the obvious thing out of the box); set `false` to let those exceptions
   * propagate like any other error (logged by the dispatcher).
   */
  replyExceptions?: boolean;
  /**
   * Default `parse_mode` for outgoing sends. Applied when a call omits
   * `parse_mode`; pass `parse_mode` explicitly on a call to override, or
   * `parse_mode: undefined` to opt that call out.
   */
  parseMode?: ParseModeValue;
  /**
   * Send plain outgoing text as Bot API 10.1 rich messages (headings, tables,
   * dividers). Omit to keep plain `sendMessage`. See {@link RichMessagesOptions}.
   */
  richMessages?: RichMessagesOptions;
  /**
   * Swallow Telegram's `message is not modified` no-op on edits (e.g. a
   * double-tapped callback button re-sending identical content). Off by
   * default. A genuinely stale edit (`can't be edited`/`not found`) still throws.
   */
  ignoreNotModified?: boolean;
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
  /**
   * Configure the `file_id` cache — its store, TTL, or key strategy. Caching is
   * opt-in per file (use `new CachedFile(path)`), so this option is only needed
   * to swap the default in-memory store. See {@link FileIdCacheOptions}.
   */
  fileIdCache?: FileIdCacheOptions;
  /**
   * Per-message keyboard state (checkbox selections, page cursors) — auto-wired,
   * configure only to override the store. Defaults to the session store's backend
   * when sessions are on, else in-memory. See {@link KeyboardStateOptions}.
   */
  keyboardState?: KeyboardStateOptions;
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

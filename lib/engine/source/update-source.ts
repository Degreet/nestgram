import { Type } from '@nestjs/common';

import { RawUpdate } from '../../events/raw-update.types';
import type { BotService } from '../../api';

/** Called once per incoming update. May be async; the source awaits it. */
export type UpdateListener = (update: RawUpdate) => void | Promise<void>;

/**
 * A pluggable source of Telegram updates.
 *
 * The source's single responsibility is *delivery*: get updates from the
 * transport and hand each one to the listener. What happens to an update
 * (routing, execution, result handling) is the dispatcher's concern, not the
 * source's. Polling and webhook both implement this contract, so switching
 * transport never touches the dispatcher.
 */
export interface UpdateSource {
  /** Begin delivering updates to `onUpdate`. Resolves once the source is live. */
  start(onUpdate: UpdateListener): Promise<void>;
  /** Stop delivering and release the transport. Resolves once fully stopped. */
  stop(): Promise<void>;
}

/**
 * What an {@link UpdateSourceFactory} receives — everything needed to build a
 * custom source or decorate the built-in one. Called once per bot, so a
 * multi-bot app can branch on `bot.name`.
 */
export interface UpdateSourceContext {
  /**
   * The transport the framework would otherwise use for this bot — polling or
   * webhook per config, or `undefined` when neither is set. Wrap it to add a
   * layer (e.g. a queue), or ignore it to replace ingestion entirely.
   */
  default?: UpdateSource;
  /** The bot this source serves — in a multi-bot app, the specific bot. */
  bot: BotService;
  /**
   * Resolve a provider from the DI container, for a custom source's
   * dependencies (looked up non-strictly, across the whole app).
   */
  get: <T>(token: Type<T> | string | symbol) => T;
}

/**
 * Builds the update source the engine drives for a bot. Set as
 * `NestgramModule.forRoot({ source })` to plug in your own transport or to
 * decorate the built-in one — return `new MyQueuedSource(ctx.default, …)` to
 * wrap, or your own `UpdateSource` to replace. The single public seam for
 * owning delivery; the framework's own queue layer is built on it.
 */
export type UpdateSourceFactory = (ctx: UpdateSourceContext) => UpdateSource;

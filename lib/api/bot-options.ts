import { ModuleMetadata, Type } from '@nestjs/common';

import type { ApiInterceptor } from './request';
import type { ParseModeValue } from './parse-mode';
import type { RichMessagesOptions } from '../builtins/rich-messages/rich-messages.types';
import type { ThrottleOptions } from '../builtins/throttle/throttle.types';
import type { FileIdCacheOptions } from '../builtins/file-id-cache/file-id-cache.types';

export interface BotOptions {
  token: string;
  /** Default `parse_mode` applied to sends that omit one. */
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
  /** Extra outbound API interceptors, run after the built-ins (before the throttler). */
  apiInterceptors?: Type<ApiInterceptor>[];
  /** Send rate-limiting: `true`/omitted = on with defaults, `false` = off, or tune it. */
  throttle?: boolean | ThrottleOptions;
  /** Replace the default throttler entirely (e.g. a distributed one). */
  throttler?: Type<ApiInterceptor>;
  /**
   * Configure the `file_id` cache — its store, TTL, or key strategy. Caching is
   * opt-in per file (use `new CachedFile(path)`), so this option is only needed
   * to swap the default in-memory store. See {@link FileIdCacheOptions}.
   */
  fileIdCache?: FileIdCacheOptions;
}

export interface BotAsyncOptions extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useExisting?: Type<BotOptions>;
  useClass?: Type<BotOptions>;
  useFactory?: (...args: any[]) => Promise<BotOptions> | BotOptions;
  /** Extra outbound API interceptors (static — not resolved via the factory). */
  apiInterceptors?: Type<ApiInterceptor>[];
  /** Replace the default throttler (static — not resolved via the factory). */
  throttler?: Type<ApiInterceptor>;
}

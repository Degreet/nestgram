import { KeyValueStore, MemoryStore } from '../../store';

/** The pieces a file-id cache key is built from. */
export interface FileIdCacheKeyInput {
  /** The bot's name — `file_id`s are bot-specific, so the key must scope by it. */
  botName: string;
  /**
   * The Bot API method (e.g. `sendPhoto`). The same bytes sent as a photo vs a
   * document get different, non-interchangeable `file_id`s, so the method scopes
   * the key.
   */
  method: string;
  /** The payload field holding the file (e.g. `photo`, `document`). */
  field: string;
  /** The file's stable source identity — its path or URL. */
  source: string;
}

/**
 * The `fileIdCache` option on `NestgramModule`/`BotModule` — purely the cache's
 * backing config. Caching itself is opt-in per file (use `new CachedFile(path)`),
 * so this is only needed to swap the default in-memory store.
 *
 * Cache only **trusted, low-cardinality** paths. A `new CachedFile()` over a
 * user-controlled path on the unbounded in-memory store mints a permanent entry
 * per distinct path and can grow without limit: set a `ttl` or supply a
 * bounded/external `store` for those.
 */
export interface FileIdCacheOptions {
  /** Where `file_id`s are stored. Defaults to a process-local in-memory store. */
  store?: KeyValueStore;
  /**
   * TTL (ms) for the default in-memory store — also the guardrail against
   * unbounded growth when sources are many. Ignored when a custom `store` is
   * supplied (that store owns its own expiry).
   */
  ttl?: number;
  /**
   * Override the cache key — e.g. fold in a content hash to auto-invalidate when
   * a file at a path changes. Return `undefined` to skip caching this call. Keep
   * `method` in the key (the default does): a `file_id` minted for one method
   * can be invalid for another (e.g. `setChatPhoto` rejects a `sendPhoto` id).
   */
  key?: (input: FileIdCacheKeyInput) => string | undefined;
}

/** {@link FileIdCacheOptions} with defaults resolved. */
export interface FileIdCacheSettings {
  store: KeyValueStore;
  botName: string;
  key: (input: FileIdCacheKeyInput) => string | undefined;
}

/**
 * DI token for the resolved {@link FileIdCacheSettings}. Provided by `BotModule`
 * from the `fileIdCache` option (or `null` when omitted); the interceptor in the
 * pipeline injects it and stays a passthrough when it's `null`.
 */
export const FILE_ID_CACHE_SETTINGS = 'nestgram:file_id_cache_settings';

const KEY_SEPARATOR = ':';
const BOT_PREFIX = 'n';

/**
 * The default key: `n<botName>:<method>:<source>`. The bot name keeps a shared
 * store safe across bots; the method keeps a photo's `file_id` from being reused
 * as a document's (Telegram returns different ids per kind). `source` (a path or
 * URL, which may itself contain `:`) stays the terminal segment so it can't
 * collide with the fixed prefix — keep it last if you extend this.
 */
export function defaultFileIdCacheKey(input: FileIdCacheKeyInput): string {
  return [`${BOT_PREFIX}${input.botName}`, input.method, input.source].join(
    KEY_SEPARATOR,
  );
}

/**
 * Resolves the `fileIdCache` option into settings, filling the defaults (a
 * process-local in-memory store, the default key). Always returns settings —
 * the cache is gated per file by the `{ cache: true }` marker, not globally, so
 * an unmarked send simply passes through.
 */
export function resolveFileIdCacheSettings(
  options: FileIdCacheOptions | undefined,
  botName: string,
): FileIdCacheSettings {
  return {
    store: options?.store ?? new MemoryStore(options?.ttl),
    botName,
    key: options?.key ?? defaultFileIdCacheKey,
  };
}

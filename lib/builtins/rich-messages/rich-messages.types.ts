import { NestgramConfigError } from '../../exceptions';

/**
 * Rich-markup dialects Telegram parses into rich blocks — each names the
 * `InputRichMessage` source field the outgoing text is sent through.
 */
export type RichMessageDialect = 'markdown' | 'html';

/**
 * When the rewrite applies: `'always'` sends every plain text as rich;
 * `'dynamic'` only when the text uses constructs plain `parse_mode` can't
 * render (headings, tables, dividers) — everything else stays a normal
 * `sendMessage`.
 */
export type RichMessagesMode = 'always' | 'dynamic';

/** The `richMessages` option on `NestgramModule`/`BotModule`. */
export interface RichMessagesOptions {
  /** The dialect every plain outgoing text is written in. */
  dialect: RichMessageDialect;
  /** Defaults to `'always'`. */
  mode?: RichMessagesMode;
}

/** {@link RichMessagesOptions} with the defaults resolved. */
export interface RichMessagesSettings {
  dialect: RichMessageDialect;
  mode: RichMessagesMode;
}

/**
 * DI token for the resolved {@link RichMessagesSettings}. Provided by `BotModule`
 * from the `richMessages` option (or `null` when it's omitted); the interceptor
 * in BotModule's pipeline injects it and stays a passthrough when it's `null`.
 */
export const RICH_MESSAGES_SETTINGS = 'nestgram:rich_messages_settings';

const DIALECTS: readonly RichMessageDialect[] = ['markdown', 'html'];
const MODES: readonly RichMessagesMode[] = ['always', 'dynamic'];
const DEFAULT_MODE: RichMessagesMode = 'always';

/**
 * Validates the `richMessages` option and resolves its defaults, or returns
 * `null` when it's absent (the feature stays off). Throws a
 * {@link NestgramConfigError} for an unknown dialect/mode, so a typo fails fast
 * at boot rather than silently disabling the rewrite.
 */
export function resolveRichMessagesSettings(
  options?: RichMessagesOptions,
): RichMessagesSettings | null {
  if (!options) {
    return null;
  }
  if (!DIALECTS.includes(options.dialect)) {
    throw new NestgramConfigError(
      `richMessages: unknown dialect "${String(
        options.dialect,
      )}" — expected one of: ${DIALECTS.join(', ')}`,
    );
  }
  if (options.mode !== undefined && !MODES.includes(options.mode)) {
    throw new NestgramConfigError(
      `richMessages: unknown mode "${String(
        options.mode,
      )}" — expected one of: ${MODES.join(', ')}`,
    );
  }
  return { dialect: options.dialect, mode: options.mode ?? DEFAULT_MODE };
}

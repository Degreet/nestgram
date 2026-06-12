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

/** Options for `RichMessagesModule.forRoot`. */
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
 * DI token for the resolved {@link RichMessagesSettings}. Provided globally by
 * `RichMessagesModule.forRoot`; the interceptor in BotModule's pipeline
 * injects it as `@Optional()` and stays a passthrough when the module was
 * never imported.
 */
export const RICH_MESSAGES_SETTINGS = 'nestgram:rich_messages_settings';

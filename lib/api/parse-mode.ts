/**
 * Every text-formatting mode Telegram accepts in a send's `parse_mode`. The
 * single source of truth for parse-mode values across the framework — assign or
 * compare against `ParseMode.X`, never a bare string.
 *
 * @see https://core.telegram.org/bots/api#formatting-options
 */
export enum ParseMode {
  Html = 'HTML',
  Markdown = 'Markdown',
  MarkdownV2 = 'MarkdownV2',
}

/**
 * A `parse_mode` accepted in send options — the string values of
 * {@link ParseMode}, so options can be written as plain literals (`'HTML'`) with
 * autocomplete and no enum import, while framework code uses `ParseMode.X`.
 */
export type ParseModeValue = `${ParseMode}`;

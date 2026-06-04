/**
 * Escapes the characters Telegram's HTML parse mode treats specially, so an
 * arbitrary string can be embedded inside an HTML-formatted message without
 * breaking the markup — or letting user input inject tags.
 *
 * Telegram's HTML mode is sensitive to exactly three characters: `&`, `<`, `>`.
 * `&` is replaced first, so the entities introduced for `<`/`>` are not
 * themselves double-escaped.
 *
 * @example
 * bot.sendMessage(chatId, `Hi <b>${escapeHtml(name)}</b>`, { parse_mode: 'HTML' });
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

import { KeyboardBuilder } from './keyboard-builder';

interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

/**
 * Fluent builder for an inline keyboard (buttons attached under a message).
 *
 * Buttons go into the current row; `.row()` starts a new one, or `.columns(n)`
 * auto-wraps into a grid. A trailing `hidden` flag drops the button (handy for
 * conditional buttons: `.text('Admin', 'admin', !isAdmin)`). Pass the instance
 * as `reply_markup` — `JSON.stringify` calls `toJSON()`, serializing to the
 * Telegram `{ inline_keyboard }` shape.
 *
 * ```ts
 * new InlineKeyboard().columns(2).text('Buy', 'buy').text('Info', 'info')
 * ```
 */
export class InlineKeyboard extends KeyboardBuilder<InlineButton> {
  /** A callback button: pressing it sends `callbackData` back as an update. */
  text(label: string, callbackData: string, hidden = false): this {
    if (!hidden) {
      this.push({ text: label, callback_data: callbackData });
    }
    return this;
  }

  /** A URL button: pressing it opens the link. */
  url(label: string, url: string, hidden = false): this {
    if (!hidden) {
      this.push({ text: label, url });
    }
    return this;
  }

  toJSON(): { inline_keyboard: InlineButton[][] } {
    return { inline_keyboard: this.filledRows };
  }
}

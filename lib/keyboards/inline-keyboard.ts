interface InlineButton {
  text: string;
  callback_data?: string;
  url?: string;
}

/**
 * Fluent builder for an inline keyboard (buttons attached under a message).
 *
 * Buttons are added to the current row; `.row()` starts a new one. Pass the
 * instance as `reply_markup` — `JSON.stringify` calls `toJSON()`, so it
 * serializes to the Telegram `{ inline_keyboard }` shape automatically.
 *
 * ```ts
 * new InlineKeyboard().text('Buy', 'buy:1').row().url('Site', 'https://...')
 * ```
 */
export class InlineKeyboard {
  private readonly rows: InlineButton[][] = [[]];

  /** A callback button: pressing it sends `callback_data` back as an update. */
  text(label: string, callbackData: string): this {
    this.currentRow().push({ text: label, callback_data: callbackData });
    return this;
  }

  /** A URL button: pressing it opens the link. */
  url(label: string, url: string): this {
    this.currentRow().push({ text: label, url });
    return this;
  }

  /** Start a new row; subsequent buttons go into it. */
  row(): this {
    this.rows.push([]);
    return this;
  }

  toJSON(): { inline_keyboard: InlineButton[][] } {
    return { inline_keyboard: this.rows.filter((row) => row.length > 0) };
  }

  private currentRow(): InlineButton[] {
    return this.rows[this.rows.length - 1];
  }
}

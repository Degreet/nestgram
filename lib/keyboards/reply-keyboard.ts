interface ReplyButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
}

interface ReplyKeyboardMarkup {
  keyboard: ReplyButton[][];
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
  selective?: boolean;
}

/**
 * Fluent builder for a custom reply keyboard (buttons under the input field).
 *
 * Buttons go into the current row; `.row()` starts a new one. Pass the instance
 * as `reply_markup` — `toJSON()` serializes to the Telegram `{ keyboard, ... }`
 * shape.
 *
 * ```ts
 * new ReplyKeyboard().text('My orders').row().text('Help').resize().oneTime()
 * ```
 */
export class ReplyKeyboard {
  private readonly rows: ReplyButton[][] = [[]];
  private resizeKeyboard = false;
  private oneTimeKeyboard = false;
  private selectiveFlag = false;
  private placeholderText?: string;

  /** A plain text button (sends its label as a message when pressed). */
  text(label: string): this {
    this.currentRow().push({ text: label });
    return this;
  }

  /** Start a new row; subsequent buttons go into it. */
  row(): this {
    this.rows.push([]);
    return this;
  }

  /** Fit the keyboard to its buttons (`resize_keyboard`). */
  resize(): this {
    this.resizeKeyboard = true;
    return this;
  }

  /** Hide the keyboard after one use (`one_time_keyboard`). */
  oneTime(): this {
    this.oneTimeKeyboard = true;
    return this;
  }

  /** Show only to the users the message replies to/mentions (`selective`). */
  selective(): this {
    this.selectiveFlag = true;
    return this;
  }

  /** Grey placeholder in the input field while the keyboard is shown. */
  placeholder(text: string): this {
    this.placeholderText = text;
    return this;
  }

  toJSON(): ReplyKeyboardMarkup {
    return {
      keyboard: this.rows.filter((row) => row.length > 0),
      ...(this.resizeKeyboard && { resize_keyboard: true }),
      ...(this.oneTimeKeyboard && { one_time_keyboard: true }),
      ...(this.selectiveFlag && { selective: true }),
      ...(this.placeholderText && {
        input_field_placeholder: this.placeholderText,
      }),
    };
  }

  private currentRow(): ReplyButton[] {
    return this.rows[this.rows.length - 1];
  }
}

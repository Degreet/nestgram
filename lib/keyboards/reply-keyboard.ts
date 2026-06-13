import { ButtonStyleValue } from './button-style';
import { KeyboardBuilder } from './keyboard-builder';

interface ReplyButton {
  text: string;
  request_contact?: boolean;
  request_location?: boolean;
  style?: ButtonStyleValue;
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
 * Buttons go into the current row; `.row()` starts a new one, or `.columns(n)`
 * auto-wraps into a grid. A trailing `hidden` flag drops the button; a colour
 * modifier (`.primary()`/`.success()`/`.danger()`) styles the next button. Pass
 * the instance as `reply_markup` — `toJSON()` serializes to the Telegram
 * `{ keyboard, ... }` shape.
 *
 * ```ts
 * new ReplyKeyboard().text('My orders').row().text('Help').resize().oneTime()
 * ```
 */
export class ReplyKeyboard extends KeyboardBuilder<ReplyButton> {
  private resizeKeyboard = false;
  private oneTimeKeyboard = false;
  private selectiveFlag = false;
  private placeholderText?: string;

  /** A plain text button (sends its label as a message when pressed). */
  text(label: string, hidden = false): this {
    this.push({ text: label }, hidden);
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
      keyboard: this.filledRows,
      ...(this.resizeKeyboard && { resize_keyboard: true }),
      ...(this.oneTimeKeyboard && { one_time_keyboard: true }),
      ...(this.selectiveFlag && { selective: true }),
      ...(this.placeholderText && {
        input_field_placeholder: this.placeholderText,
      }),
    };
  }
}

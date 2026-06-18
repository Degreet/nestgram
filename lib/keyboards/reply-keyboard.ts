import type {
  RawKeyboardButton,
  RawKeyboardButtonRequestChat,
  RawKeyboardButtonRequestUsers,
  RawReplyKeyboardMarkup,
} from '../events/raw-update.types';
import { KeyboardBuilder } from './keyboard-builder';

/** The poll kind a `requestPoll` button asks for (any when omitted). */
type PollType = 'quiz' | 'regular';

/**
 * Fluent builder for a custom reply keyboard (buttons under the input field).
 *
 * Buttons go into the current row; `.row()` starts a new one, or `.columns(n)`
 * auto-wraps into a grid. Beyond plain `.text()` buttons there is a method per
 * Bot API kind — `.requestContact()`, `.requestLocation()`, `.requestPoll()`,
 * `.webApp()`, `.requestUsers()`, `.requestChat()` — each with a trailing
 * `hidden` flag. The flags (`.resize()`/`.oneTime()`/`.persistent()`/
 * `.selective()`/`.placeholder()`) map to the Telegram markup options. Pass the
 * instance as `reply_markup` — `toJSON()` serializes to `{ keyboard, ... }`.
 *
 * ```ts
 * new ReplyKeyboard().text('My orders').row().text('Help').resize().oneTime();
 * ```
 */
export class ReplyKeyboard extends KeyboardBuilder<RawKeyboardButton> {
  private resizeKeyboard = false;
  private oneTimeKeyboard = false;
  private persistentKeyboard = false;
  private selectiveFlag = false;
  private placeholderText?: string;

  /** A plain text button (sends its label as a message when pressed). */
  text(label: string, hidden = false): this {
    return this.add1({ text: label }, hidden);
  }

  /** Ask the user to share their phone number. */
  requestContact(label: string, hidden = false): this {
    return this.add1({ text: label, request_contact: true }, hidden);
  }

  /** Ask the user to share their location. */
  requestLocation(label: string, hidden = false): this {
    return this.add1({ text: label, request_location: true }, hidden);
  }

  /** Ask the user to create a poll — `type` restricts it to a quiz or regular poll. */
  requestPoll(label: string, type?: PollType, hidden = false): this {
    return this.add1({ text: label, request_poll: { type } }, hidden);
  }

  /** A Web App button: pressing it opens the Mini App at `url`. */
  webApp(label: string, url: string, hidden = false): this {
    return this.add1({ text: label, web_app: { url } }, hidden);
  }

  /** Ask the user to pick users (the request is identified by `request_id`). */
  requestUsers(
    label: string,
    request: RawKeyboardButtonRequestUsers,
    hidden = false,
  ): this {
    return this.add1({ text: label, request_users: request }, hidden);
  }

  /** Ask the user to pick a chat (the request is identified by `request_id`). */
  requestChat(
    label: string,
    request: RawKeyboardButtonRequestChat,
    hidden = false,
  ): this {
    return this.add1({ text: label, request_chat: request }, hidden);
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

  /** Keep the keyboard open and always visible (`is_persistent`). */
  persistent(): this {
    this.persistentKeyboard = true;
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

  toJSON(): RawReplyKeyboardMarkup {
    return {
      keyboard: this.filledRows,
      ...(this.resizeKeyboard && { resize_keyboard: true }),
      ...(this.oneTimeKeyboard && { one_time_keyboard: true }),
      ...(this.persistentKeyboard && { is_persistent: true }),
      ...(this.selectiveFlag && { selective: true }),
      ...(this.placeholderText && {
        input_field_placeholder: this.placeholderText,
      }),
    };
  }

  /** Push one button through the column flow, honoring a trailing `hidden` flag. */
  private add1(button: RawKeyboardButton, hidden: boolean): this {
    this.push(button, hidden);
    return this;
  }
}

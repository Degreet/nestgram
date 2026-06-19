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
 * Buttons accumulate in the current row; `.split(n)` lays them into rows of `n`,
 * `.spread()` is one per row, and `.row()` commits a single row. Beyond plain
 * `.text()` there is a method per Bot API kind — `.requestContact()`,
 * `.requestLocation()`, `.requestPoll()`, `.webApp()`, `.requestUsers()`,
 * `.requestChat()`. The flags (`.resize()`/`.oneTime()`/`.persistent()`/
 * `.selective()`/`.placeholder()`) map to the Telegram markup options. Pass the
 * instance as `reply_markup` — `toJSON()` serializes to `{ keyboard, ... }`.
 *
 * ```ts
 * new ReplyKeyboard().text('My orders').text('Help').row().resize().oneTime();
 * ```
 */
export class ReplyKeyboard extends KeyboardBuilder<RawKeyboardButton> {
  private resizeKeyboard = false;
  private oneTimeKeyboard = false;
  private persistentKeyboard = false;
  private selectiveFlag = false;
  private placeholderText?: string;

  /** A plain text button (sends its label as a message when pressed). */
  text(label: string): this {
    this.pushButton({ text: label });
    return this;
  }

  /** Ask the user to share their phone number. */
  requestContact(label: string): this {
    this.pushButton({ text: label, request_contact: true });
    return this;
  }

  /** Ask the user to share their location. */
  requestLocation(label: string): this {
    this.pushButton({ text: label, request_location: true });
    return this;
  }

  /** Ask the user to create a poll — `type` restricts it to a quiz or regular poll. */
  requestPoll(label: string, type?: PollType): this {
    this.pushButton({ text: label, request_poll: { type } });
    return this;
  }

  /** A Web App button: pressing it opens the Mini App at `url`. */
  webApp(label: string, url: string): this {
    this.pushButton({ text: label, web_app: { url } });
    return this;
  }

  /** Ask the user to pick users (the request is identified by `request_id`). */
  requestUsers(label: string, request: RawKeyboardButtonRequestUsers): this {
    this.pushButton({ text: label, request_users: request });
    return this;
  }

  /** Ask the user to pick a chat (the request is identified by `request_id`). */
  requestChat(label: string, request: RawKeyboardButtonRequestChat): this {
    this.pushButton({ text: label, request_chat: request });
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
}

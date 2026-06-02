/**
 * Removes a custom reply keyboard. Pass as `reply_markup` to hide the keyboard
 * shown earlier by a {@link ReplyKeyboard}.
 *
 * ```ts
 * message.answer('Done', { reply_markup: new RemoveKeyboard() });
 * ```
 */
export class RemoveKeyboard {
  private selectiveFlag = false;

  /** Remove only for the users the message replies to/mentions (`selective`). */
  selective(): this {
    this.selectiveFlag = true;
    return this;
  }

  toJSON(): { remove_keyboard: true; selective?: boolean } {
    return {
      remove_keyboard: true,
      ...(this.selectiveFlag && { selective: true }),
    };
  }
}

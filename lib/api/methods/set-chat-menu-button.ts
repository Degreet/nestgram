import { ApiMethod } from './api-method';
import type { RawMenuButton } from '../../events/raw-update.types';

export interface SetChatMenuButtonOptions {
  chat_id?: number;
  menu_button?: RawMenuButton;
}

/**
 * Use this method to change the bot's menu button in a private chat, or the default menu button. Returns True on success.
 * @see https://core.telegram.org/bots/api#setchatmenubutton
 */
export class SetChatMenuButton extends ApiMethod<
  SetChatMenuButtonOptions,
  true
> {
  readonly method = 'setChatMenuButton';

  constructor(payload?: SetChatMenuButtonOptions) {
    super(payload);
  }
}

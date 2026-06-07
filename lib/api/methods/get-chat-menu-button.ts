import { ApiMethod } from './api-method';
import type { RawMenuButton } from '../../events/raw-update.types';

export interface GetChatMenuButtonOptions {
  chat_id?: number;
}

/**
 * Use this method to get the current value of the bot's menu button in a private chat, or the default menu button. Returns MenuButton on success.
 * @see https://core.telegram.org/bots/api#getchatmenubutton
 */
export class GetChatMenuButton extends ApiMethod<
  GetChatMenuButtonOptions,
  RawMenuButton
> {
  readonly method = 'getChatMenuButton';

  constructor(payload?: GetChatMenuButtonOptions) {
    super(payload);
  }
}

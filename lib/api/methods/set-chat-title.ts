import { ApiMethod } from './api-method';

export interface SetChatTitleOptions {
  chat_id: number | string;
  title: string;
}

/**
 * Use this method to change the title of a chat. Titles can't be changed for private chats. The bot must be an administrator in the chat for this to work and must have the appropriate administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#setchattitle
 */
export class SetChatTitle extends ApiMethod<SetChatTitleOptions, true> {
  readonly method = 'setChatTitle';

  constructor(payload: SetChatTitleOptions) {
    super(payload);
  }
}

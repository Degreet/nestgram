import { ApiMethod } from './api-method';

export interface BanChatSenderChatOptions {
  chat_id: number | string;
  sender_chat_id: number;
}

/**
 * Use this method to ban a channel chat in a supergroup or a channel. Until the chat is unbanned, the owner of the banned chat won't be able to send messages on behalf of any of their channels. The bot must be an administrator in the supergroup or channel for this to work and must have the appropriate administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#banchatsenderchat
 */
export class BanChatSenderChat extends ApiMethod<
  BanChatSenderChatOptions,
  true
> {
  readonly method = 'banChatSenderChat';

  constructor(payload: BanChatSenderChatOptions) {
    super(payload);
  }
}

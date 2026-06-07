import { ApiMethod } from './api-method';

export interface UnbanChatSenderChatOptions {
  chat_id: number | string;
  sender_chat_id: number;
}

/**
 * Use this method to unban a previously banned channel chat in a supergroup or channel. The bot must be an administrator for this to work and must have the appropriate administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#unbanchatsenderchat
 */
export class UnbanChatSenderChat extends ApiMethod<
  UnbanChatSenderChatOptions,
  true
> {
  readonly method = 'unbanChatSenderChat';

  constructor(payload: UnbanChatSenderChatOptions) {
    super(payload);
  }
}

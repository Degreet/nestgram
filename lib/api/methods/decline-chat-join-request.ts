import { ApiMethod } from './api-method';

export interface DeclineChatJoinRequestOptions {
  chat_id: number | string;
  user_id: number;
}

/**
 * Use this method to decline a chat join request. The bot must be an administrator in the chat for this to work and must have the can_invite_users administrator right. Returns True on success.
 * @see https://core.telegram.org/bots/api#declinechatjoinrequest
 */
export class DeclineChatJoinRequest extends ApiMethod<
  DeclineChatJoinRequestOptions,
  true
> {
  readonly method = 'declineChatJoinRequest';

  constructor(payload: DeclineChatJoinRequestOptions) {
    super(payload);
  }
}

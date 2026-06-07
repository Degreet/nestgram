import { ApiMethod } from './api-method';

export interface UnbanChatMemberOptions {
  chat_id: number | string;
  user_id: number;
  only_if_banned?: boolean;
}

/**
 * Use this method to unban a previously banned user in a supergroup or channel. The user will not return to the group or channel automatically, but will be able to join via link, etc. The bot must be an administrator for this to work. By default, this method guarantees that after the call the user is not a member of the chat, but will be able to join it. So if the user is a member of the chat they will also be removed from the chat. If you don't want this, use the parameter only_if_banned. Returns True on success.
 * @see https://core.telegram.org/bots/api#unbanchatmember
 */
export class UnbanChatMember extends ApiMethod<UnbanChatMemberOptions, true> {
  readonly method = 'unbanChatMember';

  constructor(payload: UnbanChatMemberOptions) {
    super(payload);
  }
}

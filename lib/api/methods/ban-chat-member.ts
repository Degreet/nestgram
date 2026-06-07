import { ApiMethod } from './api-method';

export interface BanChatMemberOptions {
  chat_id: number | string;
  user_id: number;
  until_date?: number;
  revoke_messages?: boolean;
}

/**
 * Use this method to ban a user in a group, a supergroup or a channel. In the case of supergroups and channels, the user will not be able to return to the chat on their own using invite links, etc., unless unbanned first. The bot must be an administrator in the chat for this to work and must have the appropriate administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#banchatmember
 */
export class BanChatMember extends ApiMethod<BanChatMemberOptions, true> {
  readonly method = 'banChatMember';

  constructor(payload: BanChatMemberOptions) {
    super(payload);
  }
}

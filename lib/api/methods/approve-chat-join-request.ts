import { ApiMethod } from './api-method';

export interface ApproveChatJoinRequestOptions {
  chat_id: number | string;
  user_id: number;
}

/**
 * Use this method to approve a chat join request. The bot must be an administrator in the chat for this to work and must have the can_invite_users administrator right. Returns True on success.
 * @see https://core.telegram.org/bots/api#approvechatjoinrequest
 */
export class ApproveChatJoinRequest extends ApiMethod<
  ApproveChatJoinRequestOptions,
  true
> {
  readonly method = 'approveChatJoinRequest';

  constructor(payload: ApproveChatJoinRequestOptions) {
    super(payload);
  }
}

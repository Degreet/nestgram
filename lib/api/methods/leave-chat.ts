import { ApiMethod } from './api-method';

export interface LeaveChatOptions {
  chat_id: number | string;
}

/**
 * Use this method for your bot to leave a group, supergroup or channel. Returns True on success.
 * @see https://core.telegram.org/bots/api#leavechat
 */
export class LeaveChat extends ApiMethod<LeaveChatOptions, true> {
  readonly method = 'leaveChat';

  constructor(payload: LeaveChatOptions) {
    super(payload);
  }
}

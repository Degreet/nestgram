import { ApiMethod } from './api-method';

export interface ApproveSuggestedPostOptions {
  chat_id: number;
  message_id: number;
  send_date?: number;
}

/**
 * Use this method to approve a suggested post in a direct messages chat. The bot must have the 'can_post_messages' administrator right in the corresponding channel chat. Returns True on success.
 * @see https://core.telegram.org/bots/api#approvesuggestedpost
 */
export class ApproveSuggestedPost extends ApiMethod<
  ApproveSuggestedPostOptions,
  true
> {
  readonly method = 'approveSuggestedPost';

  constructor(payload: ApproveSuggestedPostOptions) {
    super(payload);
  }
}

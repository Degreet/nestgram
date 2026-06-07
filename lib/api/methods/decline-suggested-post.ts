import { ApiMethod } from './api-method';

export interface DeclineSuggestedPostOptions {
  chat_id: number;
  message_id: number;
  comment?: string;
}

/**
 * Use this method to decline a suggested post in a direct messages chat. The bot must have the 'can_manage_direct_messages' administrator right in the corresponding channel chat. Returns True on success.
 * @see https://core.telegram.org/bots/api#declinesuggestedpost
 */
export class DeclineSuggestedPost extends ApiMethod<
  DeclineSuggestedPostOptions,
  true
> {
  readonly method = 'declineSuggestedPost';

  constructor(payload: DeclineSuggestedPostOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type { RawMessage } from '../../events/raw-update.types';

export interface GetUserPersonalChatMessagesOptions {
  user_id: number;
  limit: number;
}

/**
 * Use this method to get the last messages from the personal chat (i.e., the chat currently added to their profile) of a given user. On success, an array of Message objects is returned.
 * @see https://core.telegram.org/bots/api#getuserpersonalchatmessages
 */
export class GetUserPersonalChatMessages extends ApiMethod<
  GetUserPersonalChatMessagesOptions,
  RawMessage[]
> {
  readonly method = 'getUserPersonalChatMessages';

  constructor(payload: GetUserPersonalChatMessagesOptions) {
    super(payload);
  }
}

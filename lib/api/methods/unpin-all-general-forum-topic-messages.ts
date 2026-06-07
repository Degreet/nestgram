import { ApiMethod } from './api-method';

export interface UnpinAllGeneralForumTopicMessagesOptions {
  chat_id: number | string;
}

/**
 * Use this method to clear the list of pinned messages in a General forum topic. The bot must be an administrator in the chat for this to work and must have the can_pin_messages administrator right in the supergroup. Returns True on success.
 * @see https://core.telegram.org/bots/api#unpinallgeneralforumtopicmessages
 */
export class UnpinAllGeneralForumTopicMessages extends ApiMethod<
  UnpinAllGeneralForumTopicMessagesOptions,
  true
> {
  readonly method = 'unpinAllGeneralForumTopicMessages';

  constructor(payload: UnpinAllGeneralForumTopicMessagesOptions) {
    super(payload);
  }
}

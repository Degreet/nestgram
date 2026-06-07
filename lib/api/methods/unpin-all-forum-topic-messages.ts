import { ApiMethod } from './api-method';

export interface UnpinAllForumTopicMessagesOptions {
  chat_id: number | string;
  message_thread_id: number;
}

/**
 * Use this method to clear the list of pinned messages in a forum topic in a forum supergroup chat or a private chat with a user. In the case of a supergroup chat the bot must be an administrator in the chat for this to work and must have the can_pin_messages administrator right in the supergroup. Returns True on success.
 * @see https://core.telegram.org/bots/api#unpinallforumtopicmessages
 */
export class UnpinAllForumTopicMessages extends ApiMethod<
  UnpinAllForumTopicMessagesOptions,
  true
> {
  readonly method = 'unpinAllForumTopicMessages';

  constructor(payload: UnpinAllForumTopicMessagesOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface DeleteForumTopicOptions {
  chat_id: number | string;
  message_thread_id: number;
}

/**
 * Use this method to delete a forum topic along with all its messages in a forum supergroup chat or a private chat with a user. In the case of a supergroup chat the bot must be an administrator in the chat for this to work and must have the can_delete_messages administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#deleteforumtopic
 */
export class DeleteForumTopic extends ApiMethod<DeleteForumTopicOptions, true> {
  readonly method = 'deleteForumTopic';

  constructor(payload: DeleteForumTopicOptions) {
    super(payload);
  }
}

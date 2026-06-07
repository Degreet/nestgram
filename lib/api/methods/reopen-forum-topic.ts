import { ApiMethod } from './api-method';

export interface ReopenForumTopicOptions {
  chat_id: number | string;
  message_thread_id: number;
}

/**
 * Use this method to reopen a closed topic in a forum supergroup chat. The bot must be an administrator in the chat for this to work and must have the can_manage_topics administrator rights, unless it is the creator of the topic. Returns True on success.
 * @see https://core.telegram.org/bots/api#reopenforumtopic
 */
export class ReopenForumTopic extends ApiMethod<ReopenForumTopicOptions, true> {
  readonly method = 'reopenForumTopic';

  constructor(payload: ReopenForumTopicOptions) {
    super(payload);
  }
}

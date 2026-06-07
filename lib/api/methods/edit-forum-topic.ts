import { ApiMethod } from './api-method';

export interface EditForumTopicOptions {
  chat_id: number | string;
  message_thread_id: number;
  name?: string;
  icon_custom_emoji_id?: string;
}

/**
 * Use this method to edit name and icon of a topic in a forum supergroup chat or a private chat with a user. In the case of a supergroup chat the bot must be an administrator in the chat for this to work and must have the can_manage_topics administrator rights, unless it is the creator of the topic. Returns True on success.
 * @see https://core.telegram.org/bots/api#editforumtopic
 */
export class EditForumTopic extends ApiMethod<EditForumTopicOptions, true> {
  readonly method = 'editForumTopic';

  constructor(payload: EditForumTopicOptions) {
    super(payload);
  }
}

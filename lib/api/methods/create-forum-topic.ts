import { ApiMethod } from './api-method';
import type { RawForumTopic } from '../../events/raw-update.types';

export interface CreateForumTopicOptions {
  chat_id: number | string;
  name: string;
  icon_color?: number;
  icon_custom_emoji_id?: string;
}

/**
 * Use this method to create a topic in a forum supergroup chat or a private chat with a user. In the case of a supergroup chat the bot must be an administrator in the chat for this to work and must have the can_manage_topics administrator right. In the case of a private chat, a link to the topic can be created in the format https://t.me/<bot_username>/<message_thread_id>; the link opens the topic only for the user. Returns information about the created topic as a ForumTopic object.
 * @see https://core.telegram.org/bots/api#createforumtopic
 */
export class CreateForumTopic extends ApiMethod<
  CreateForumTopicOptions,
  RawForumTopic
> {
  readonly method = 'createForumTopic';

  constructor(payload: CreateForumTopicOptions) {
    super(payload);
  }
}

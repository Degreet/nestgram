import { ApiMethod } from './api-method';

export interface UnhideGeneralForumTopicOptions {
  chat_id: number | string;
}

/**
 * Use this method to unhide the 'General' topic in a forum supergroup chat. The bot must be an administrator in the chat for this to work and must have the can_manage_topics administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#unhidegeneralforumtopic
 */
export class UnhideGeneralForumTopic extends ApiMethod<
  UnhideGeneralForumTopicOptions,
  true
> {
  readonly method = 'unhideGeneralForumTopic';

  constructor(payload: UnhideGeneralForumTopicOptions) {
    super(payload);
  }
}

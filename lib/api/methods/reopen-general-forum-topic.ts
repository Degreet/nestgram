import { ApiMethod } from './api-method';

export interface ReopenGeneralForumTopicOptions {
  chat_id: number | string;
}

/**
 * Use this method to reopen a closed 'General' topic in a forum supergroup chat. The bot must be an administrator in the chat for this to work and must have the can_manage_topics administrator rights. The topic will be automatically unhidden if it was hidden. Returns True on success.
 * @see https://core.telegram.org/bots/api#reopengeneralforumtopic
 */
export class ReopenGeneralForumTopic extends ApiMethod<
  ReopenGeneralForumTopicOptions,
  true
> {
  readonly method = 'reopenGeneralForumTopic';

  constructor(payload: ReopenGeneralForumTopicOptions) {
    super(payload);
  }
}

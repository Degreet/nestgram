import { ApiMethod } from './api-method';

export interface HideGeneralForumTopicOptions {
  chat_id: number | string;
}

/**
 * Use this method to hide the 'General' topic in a forum supergroup chat. The bot must be an administrator in the chat for this to work and must have the can_manage_topics administrator rights. The topic will be automatically closed if it was open. Returns True on success.
 * @see https://core.telegram.org/bots/api#hidegeneralforumtopic
 */
export class HideGeneralForumTopic extends ApiMethod<
  HideGeneralForumTopicOptions,
  true
> {
  readonly method = 'hideGeneralForumTopic';

  constructor(payload: HideGeneralForumTopicOptions) {
    super(payload);
  }
}

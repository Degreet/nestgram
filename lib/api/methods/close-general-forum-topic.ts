import { ApiMethod } from './api-method';

export interface CloseGeneralForumTopicOptions {
  chat_id: number | string;
}

/**
 * Use this method to close an open 'General' topic in a forum supergroup chat. The bot must be an administrator in the chat for this to work and must have the can_manage_topics administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#closegeneralforumtopic
 */
export class CloseGeneralForumTopic extends ApiMethod<
  CloseGeneralForumTopicOptions,
  true
> {
  readonly method = 'closeGeneralForumTopic';

  constructor(payload: CloseGeneralForumTopicOptions) {
    super(payload);
  }
}

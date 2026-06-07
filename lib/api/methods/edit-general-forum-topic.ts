import { ApiMethod } from './api-method';

export interface EditGeneralForumTopicOptions {
  chat_id: number | string;
  name: string;
}

/**
 * Use this method to edit the name of the 'General' topic in a forum supergroup chat. The bot must be an administrator in the chat for this to work and must have the can_manage_topics administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#editgeneralforumtopic
 */
export class EditGeneralForumTopic extends ApiMethod<
  EditGeneralForumTopicOptions,
  true
> {
  readonly method = 'editGeneralForumTopic';

  constructor(payload: EditGeneralForumTopicOptions) {
    super(payload);
  }
}

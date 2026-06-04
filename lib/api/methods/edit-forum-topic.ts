import { ApiMethod } from './api-method';

export interface EditForumTopicOptions {
  chat_id: number | string;
  message_thread_id: number;
  name?: string;
  icon_custom_emoji_id?: string;
}

export class EditForumTopic extends ApiMethod<EditForumTopicOptions, true> {
  readonly method = 'editForumTopic';

  constructor(payload: EditForumTopicOptions) {
    super(payload);
  }
}

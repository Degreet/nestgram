import { ApiMethod } from './api-method';

export interface CloseForumTopicOptions {
  chat_id: number | string;
  message_thread_id: number;
}

export class CloseForumTopic extends ApiMethod<CloseForumTopicOptions, true> {
  readonly method = 'closeForumTopic';

  constructor(payload: CloseForumTopicOptions) {
    super(payload);
  }
}

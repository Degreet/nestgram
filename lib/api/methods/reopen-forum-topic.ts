import { ApiMethod } from './api-method';

export interface ReopenForumTopicOptions {
  chat_id: number | string;
  message_thread_id: number;
}

export class ReopenForumTopic extends ApiMethod<ReopenForumTopicOptions, true> {
  readonly method = 'reopenForumTopic';

  constructor(payload: ReopenForumTopicOptions) {
    super(payload);
  }
}

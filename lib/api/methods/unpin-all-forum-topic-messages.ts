import { ApiMethod } from './api-method';

export interface UnpinAllForumTopicMessagesOptions {
  chat_id: number | string;
  message_thread_id: number;
}

export class UnpinAllForumTopicMessages extends ApiMethod<
  UnpinAllForumTopicMessagesOptions,
  true
> {
  readonly method = 'unpinAllForumTopicMessages';

  constructor(payload: UnpinAllForumTopicMessagesOptions) {
    super(payload);
  }
}

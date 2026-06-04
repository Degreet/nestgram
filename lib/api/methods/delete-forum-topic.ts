import { ApiMethod } from './api-method';

export interface DeleteForumTopicOptions {
  chat_id: number | string;
  message_thread_id: number;
}

export class DeleteForumTopic extends ApiMethod<DeleteForumTopicOptions, true> {
  readonly method = 'deleteForumTopic';

  constructor(payload: DeleteForumTopicOptions) {
    super(payload);
  }
}

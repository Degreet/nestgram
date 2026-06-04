import { ApiMethod } from './api-method';

export interface DeleteMessagesOptions {
  chat_id: number | string;
  message_ids: number[];
}

export class DeleteMessages extends ApiMethod<DeleteMessagesOptions, true> {
  readonly method = 'deleteMessages';

  constructor(payload: DeleteMessagesOptions) {
    super(payload);
  }
}

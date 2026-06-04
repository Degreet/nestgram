import { ApiMethod } from './api-method';

export interface DeleteMessageOptions {
  chat_id: number | string;
  message_id: number;
}

export class DeleteMessage extends ApiMethod<DeleteMessageOptions, true> {
  readonly method = 'deleteMessage';

  constructor(payload: DeleteMessageOptions) {
    super(payload);
  }
}

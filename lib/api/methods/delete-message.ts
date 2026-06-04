import { ApiMethod } from './api-method';

export interface DeleteMessageOptions {
  chat_id: number | string;
  message_id: number;
}

/** Deletes a message. Returns `true` on success. */
export class DeleteMessage extends ApiMethod<DeleteMessageOptions, true> {
  readonly method = 'deleteMessage';

  constructor(payload: DeleteMessageOptions) {
    super(payload);
  }
}

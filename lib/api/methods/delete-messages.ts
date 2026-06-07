import { ApiMethod } from './api-method';

export interface DeleteMessagesOptions {
  chat_id: number | string;
  message_ids: number[];
}

/**
 * Use this method to delete multiple messages simultaneously. If some of the specified messages can't be found, they are skipped. Returns True on success.
 * @see https://core.telegram.org/bots/api#deletemessages
 */
export class DeleteMessages extends ApiMethod<DeleteMessagesOptions, true> {
  readonly method = 'deleteMessages';

  constructor(payload: DeleteMessagesOptions) {
    super(payload);
  }
}

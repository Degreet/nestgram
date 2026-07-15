import { ApiMethod } from './api-method';

export interface DeleteEphemeralMessageOptions {
  chat_id: number | string;
  receiver_user_id: number;
  ephemeral_message_id: number;
}

/**
 * Use this method to delete an ephemeral message. Note that it is not guaranteed that the user will receive the message deletion event, especially if they are offline. Returns True on success.
 * @see https://core.telegram.org/bots/api#deleteephemeralmessage
 */
export class DeleteEphemeralMessage extends ApiMethod<
  DeleteEphemeralMessageOptions,
  true
> {
  readonly method = 'deleteEphemeralMessage';

  constructor(payload: DeleteEphemeralMessageOptions) {
    super(payload);
  }
}

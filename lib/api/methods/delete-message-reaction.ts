import { ApiMethod } from './api-method';

export interface DeleteMessageReactionOptions {
  chat_id: number | string;
  message_id: number;
  user_id?: number;
  actor_chat_id?: number;
}

/**
 * Use this method to remove a reaction from a message in a group or a supergroup chat. The bot must have the 'can_delete_messages' administrator right in the chat. Returns True on success.
 * @see https://core.telegram.org/bots/api#deletemessagereaction
 */
export class DeleteMessageReaction extends ApiMethod<
  DeleteMessageReactionOptions,
  true
> {
  readonly method = 'deleteMessageReaction';

  constructor(payload: DeleteMessageReactionOptions) {
    super(payload);
  }
}

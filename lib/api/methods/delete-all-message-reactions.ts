import { ApiMethod } from './api-method';

export interface DeleteAllMessageReactionsOptions {
  chat_id: number | string;
  user_id?: number;
  actor_chat_id?: number;
}

/**
 * Use this method to remove up to 10000 recent reactions in a group or a supergroup chat added by a given user or chat. The bot must have the 'can_delete_messages' administrator right in the chat. Returns True on success.
 * @see https://core.telegram.org/bots/api#deleteallmessagereactions
 */
export class DeleteAllMessageReactions extends ApiMethod<
  DeleteAllMessageReactionsOptions,
  true
> {
  readonly method = 'deleteAllMessageReactions';

  constructor(payload: DeleteAllMessageReactionsOptions) {
    super(payload);
  }
}

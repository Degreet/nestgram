import { ApiMethod } from './api-method';

export interface DeleteBusinessMessagesOptions {
  business_connection_id: string;
  message_ids: number[];
}

/**
 * Delete messages on behalf of a business account. Requires the can_delete_sent_messages business bot right to delete messages sent by the bot itself, or the can_delete_all_messages business bot right to delete any message. Returns True on success.
 * @see https://core.telegram.org/bots/api#deletebusinessmessages
 */
export class DeleteBusinessMessages extends ApiMethod<
  DeleteBusinessMessagesOptions,
  true
> {
  readonly method = 'deleteBusinessMessages';

  constructor(payload: DeleteBusinessMessagesOptions) {
    super(payload);
  }
}

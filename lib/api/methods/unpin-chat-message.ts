import { ApiMethod } from './api-method';

export interface UnpinChatMessageOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_id?: number;
}

/**
 * Use this method to remove a message from the list of pinned messages in a chat. In private chats and channel direct messages chats, all messages can be unpinned. Conversely, the bot must be an administrator with the 'can_pin_messages' right or the 'can_edit_messages' right to unpin messages in groups and channels respectively. Returns True on success.
 * @see https://core.telegram.org/bots/api#unpinchatmessage
 */
export class UnpinChatMessage extends ApiMethod<UnpinChatMessageOptions, true> {
  readonly method = 'unpinChatMessage';

  constructor(payload: UnpinChatMessageOptions) {
    super(payload);
  }
}

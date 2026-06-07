import { ApiMethod } from './api-method';

export interface UnpinAllChatMessagesOptions {
  chat_id: number | string;
}

/**
 * Use this method to clear the list of pinned messages in a chat. In private chats and channel direct messages chats, no additional rights are required to unpin all pinned messages. Conversely, the bot must be an administrator with the 'can_pin_messages' right or the 'can_edit_messages' right to unpin all pinned messages in groups and channels respectively. Returns True on success.
 * @see https://core.telegram.org/bots/api#unpinallchatmessages
 */
export class UnpinAllChatMessages extends ApiMethod<
  UnpinAllChatMessagesOptions,
  true
> {
  readonly method = 'unpinAllChatMessages';

  constructor(payload: UnpinAllChatMessagesOptions) {
    super(payload);
  }
}

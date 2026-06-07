import { ApiMethod } from './api-method';

export interface PinChatMessageOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_id: number;
  disable_notification?: boolean;
}

/**
 * Use this method to add a message to the list of pinned messages in a chat. In private chats and channel direct messages chats, all non-service messages can be pinned. Conversely, the bot must be an administrator with the 'can_pin_messages' right or the 'can_edit_messages' right to pin messages in groups and channels respectively. Returns True on success.
 * @see https://core.telegram.org/bots/api#pinchatmessage
 */
export class PinChatMessage extends ApiMethod<PinChatMessageOptions, true> {
  readonly method = 'pinChatMessage';

  constructor(payload: PinChatMessageOptions) {
    super(payload);
  }
}

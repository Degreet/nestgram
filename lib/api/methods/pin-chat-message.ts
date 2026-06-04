import { ApiMethod } from './api-method';

export interface PinChatMessageOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_id: number;
  disable_notification?: boolean;
}

export class PinChatMessage extends ApiMethod<PinChatMessageOptions, true> {
  readonly method = 'pinChatMessage';

  constructor(payload: PinChatMessageOptions) {
    super(payload);
  }
}

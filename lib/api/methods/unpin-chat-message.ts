import { ApiMethod } from './api-method';

export interface UnpinChatMessageOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_id?: number;
}

export class UnpinChatMessage extends ApiMethod<UnpinChatMessageOptions, true> {
  readonly method = 'unpinChatMessage';

  constructor(payload: UnpinChatMessageOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface BanChatSenderChatOptions {
  chat_id: number | string;
  sender_chat_id: number;
}

export class BanChatSenderChat extends ApiMethod<
  BanChatSenderChatOptions,
  true
> {
  readonly method = 'banChatSenderChat';

  constructor(payload: BanChatSenderChatOptions) {
    super(payload);
  }
}

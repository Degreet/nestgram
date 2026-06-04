import { ApiMethod } from './api-method';

export interface UnbanChatSenderChatOptions {
  chat_id: number | string;
  sender_chat_id: number;
}

export class UnbanChatSenderChat extends ApiMethod<
  UnbanChatSenderChatOptions,
  true
> {
  readonly method = 'unbanChatSenderChat';

  constructor(payload: UnbanChatSenderChatOptions) {
    super(payload);
  }
}

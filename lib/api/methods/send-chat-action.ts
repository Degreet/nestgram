import { ApiMethod } from './api-method';

export interface SendChatActionOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  action: string;
}

export class SendChatAction extends ApiMethod<SendChatActionOptions, true> {
  readonly method = 'sendChatAction';

  constructor(payload: SendChatActionOptions) {
    super(payload);
  }
}

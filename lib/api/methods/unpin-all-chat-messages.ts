import { ApiMethod } from './api-method';

export interface UnpinAllChatMessagesOptions {
  chat_id: number | string;
}

export class UnpinAllChatMessages extends ApiMethod<
  UnpinAllChatMessagesOptions,
  true
> {
  readonly method = 'unpinAllChatMessages';

  constructor(payload: UnpinAllChatMessagesOptions) {
    super(payload);
  }
}

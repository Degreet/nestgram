import { ApiMethod } from './api-method';

export interface LeaveChatOptions {
  chat_id: number | string;
}

export class LeaveChat extends ApiMethod<LeaveChatOptions, true> {
  readonly method = 'leaveChat';

  constructor(payload: LeaveChatOptions) {
    super(payload);
  }
}

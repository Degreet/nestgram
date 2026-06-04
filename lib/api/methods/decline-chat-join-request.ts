import { ApiMethod } from './api-method';

export interface DeclineChatJoinRequestOptions {
  chat_id: number | string;
  user_id: number;
}

export class DeclineChatJoinRequest extends ApiMethod<
  DeclineChatJoinRequestOptions,
  true
> {
  readonly method = 'declineChatJoinRequest';

  constructor(payload: DeclineChatJoinRequestOptions) {
    super(payload);
  }
}

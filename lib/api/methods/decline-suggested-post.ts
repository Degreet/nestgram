import { ApiMethod } from './api-method';

export interface DeclineSuggestedPostOptions {
  chat_id: number;
  message_id: number;
  comment?: string;
}

export class DeclineSuggestedPost extends ApiMethod<
  DeclineSuggestedPostOptions,
  true
> {
  readonly method = 'declineSuggestedPost';

  constructor(payload: DeclineSuggestedPostOptions) {
    super(payload);
  }
}

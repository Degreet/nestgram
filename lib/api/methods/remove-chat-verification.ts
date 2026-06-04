import { ApiMethod } from './api-method';

export interface RemoveChatVerificationOptions {
  chat_id: number | string;
}

export class RemoveChatVerification extends ApiMethod<
  RemoveChatVerificationOptions,
  true
> {
  readonly method = 'removeChatVerification';

  constructor(payload: RemoveChatVerificationOptions) {
    super(payload);
  }
}

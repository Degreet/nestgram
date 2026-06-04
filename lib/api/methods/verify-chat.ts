import { ApiMethod } from './api-method';

export interface VerifyChatOptions {
  chat_id: number | string;
  custom_description?: string;
}

export class VerifyChat extends ApiMethod<VerifyChatOptions, true> {
  readonly method = 'verifyChat';

  constructor(payload: VerifyChatOptions) {
    super(payload);
  }
}

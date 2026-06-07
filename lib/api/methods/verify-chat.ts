import { ApiMethod } from './api-method';

export interface VerifyChatOptions {
  chat_id: number | string;
  custom_description?: string;
}

/**
 * Verifies a chat on behalf of the organization which is represented by the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#verifychat
 */
export class VerifyChat extends ApiMethod<VerifyChatOptions, true> {
  readonly method = 'verifyChat';

  constructor(payload: VerifyChatOptions) {
    super(payload);
  }
}

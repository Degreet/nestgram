import { ApiMethod } from './api-method';

export interface RemoveChatVerificationOptions {
  chat_id: number | string;
}

/**
 * Removes verification from a chat that is currently verified on behalf of the organization represented by the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#removechatverification
 */
export class RemoveChatVerification extends ApiMethod<
  RemoveChatVerificationOptions,
  true
> {
  readonly method = 'removeChatVerification';

  constructor(payload: RemoveChatVerificationOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface RemoveUserVerificationOptions {
  user_id: number;
}

/**
 * Removes verification from a user who is currently verified on behalf of the organization represented by the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#removeuserverification
 */
export class RemoveUserVerification extends ApiMethod<
  RemoveUserVerificationOptions,
  true
> {
  readonly method = 'removeUserVerification';

  constructor(payload: RemoveUserVerificationOptions) {
    super(payload);
  }
}

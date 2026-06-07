import { ApiMethod } from './api-method';

export interface VerifyUserOptions {
  user_id: number;
  custom_description?: string;
}

/**
 * Verifies a user on behalf of the organization which is represented by the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#verifyuser
 */
export class VerifyUser extends ApiMethod<VerifyUserOptions, true> {
  readonly method = 'verifyUser';

  constructor(payload: VerifyUserOptions) {
    super(payload);
  }
}

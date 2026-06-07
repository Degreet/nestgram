import { ApiMethod } from './api-method';

export interface SetBusinessAccountUsernameOptions {
  business_connection_id: string;
  username?: string;
}

/**
 * Changes the username of a managed business account. Requires the can_change_username business bot right. Returns True on success.
 * @see https://core.telegram.org/bots/api#setbusinessaccountusername
 */
export class SetBusinessAccountUsername extends ApiMethod<
  SetBusinessAccountUsernameOptions,
  true
> {
  readonly method = 'setBusinessAccountUsername';

  constructor(payload: SetBusinessAccountUsernameOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface SetBusinessAccountNameOptions {
  business_connection_id: string;
  first_name: string;
  last_name?: string;
}

/**
 * Changes the first and last name of a managed business account. Requires the can_change_name business bot right. Returns True on success.
 * @see https://core.telegram.org/bots/api#setbusinessaccountname
 */
export class SetBusinessAccountName extends ApiMethod<
  SetBusinessAccountNameOptions,
  true
> {
  readonly method = 'setBusinessAccountName';

  constructor(payload: SetBusinessAccountNameOptions) {
    super(payload);
  }
}

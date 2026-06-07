import { ApiMethod } from './api-method';

export interface SetBusinessAccountBioOptions {
  business_connection_id: string;
  bio?: string;
}

/**
 * Changes the bio of a managed business account. Requires the can_change_bio business bot right. Returns True on success.
 * @see https://core.telegram.org/bots/api#setbusinessaccountbio
 */
export class SetBusinessAccountBio extends ApiMethod<
  SetBusinessAccountBioOptions,
  true
> {
  readonly method = 'setBusinessAccountBio';

  constructor(payload: SetBusinessAccountBioOptions) {
    super(payload);
  }
}

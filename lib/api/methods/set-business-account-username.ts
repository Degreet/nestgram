import { ApiMethod } from './api-method';

export interface SetBusinessAccountUsernameOptions {
  business_connection_id: string;
  username?: string;
}

export class SetBusinessAccountUsername extends ApiMethod<
  SetBusinessAccountUsernameOptions,
  true
> {
  readonly method = 'setBusinessAccountUsername';

  constructor(payload: SetBusinessAccountUsernameOptions) {
    super(payload);
  }
}

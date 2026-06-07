import { ApiMethod } from './api-method';

export interface SetBusinessAccountNameOptions {
  business_connection_id: string;
  first_name: string;
  last_name?: string;
}

export class SetBusinessAccountName extends ApiMethod<
  SetBusinessAccountNameOptions,
  true
> {
  readonly method = 'setBusinessAccountName';

  constructor(payload: SetBusinessAccountNameOptions) {
    super(payload);
  }
}

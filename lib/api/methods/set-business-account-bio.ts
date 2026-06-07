import { ApiMethod } from './api-method';

export interface SetBusinessAccountBioOptions {
  business_connection_id: string;
  bio?: string;
}

export class SetBusinessAccountBio extends ApiMethod<
  SetBusinessAccountBioOptions,
  true
> {
  readonly method = 'setBusinessAccountBio';

  constructor(payload: SetBusinessAccountBioOptions) {
    super(payload);
  }
}

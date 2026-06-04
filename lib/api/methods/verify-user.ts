import { ApiMethod } from './api-method';

export interface VerifyUserOptions {
  user_id: number;
  custom_description?: string;
}

export class VerifyUser extends ApiMethod<VerifyUserOptions, true> {
  readonly method = 'verifyUser';

  constructor(payload: VerifyUserOptions) {
    super(payload);
  }
}

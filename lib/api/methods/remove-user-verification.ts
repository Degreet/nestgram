import { ApiMethod } from './api-method';

export interface RemoveUserVerificationOptions {
  user_id: number;
}

export class RemoveUserVerification extends ApiMethod<
  RemoveUserVerificationOptions,
  true
> {
  readonly method = 'removeUserVerification';

  constructor(payload: RemoveUserVerificationOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export class RemoveMyProfilePhoto extends ApiMethod<null, true> {
  readonly method = 'removeMyProfilePhoto';

  constructor() {
    super(null);
  }
}

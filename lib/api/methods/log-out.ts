import { ApiMethod } from './api-method';

export class LogOut extends ApiMethod<null, true> {
  readonly method = 'logOut';

  readonly throttled = false;

  constructor() {
    super(null);
  }
}

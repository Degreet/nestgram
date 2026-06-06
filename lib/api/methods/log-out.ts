import { ApiMethod } from './api-method';

export class LogOut extends ApiMethod<null, true> {
  readonly method = 'logOut';

  constructor() {
    super(null);
  }
}

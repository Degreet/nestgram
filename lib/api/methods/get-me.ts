import { ApiMethod } from './api-method';
import type { User } from '../../events/user';

export class GetMe extends ApiMethod<null, User> {
  readonly method = 'getMe';

  constructor() {
    super(null);
  }
}

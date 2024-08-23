import { ApiMethod } from './ApiMethod';

import { User } from '../../types';

export class GetMe extends ApiMethod<null, User> {
  protected readonly methodName = 'getMe';
  protected readonly isFormData = false;

  constructor(token: string) {
    super(token, null);
  }
}

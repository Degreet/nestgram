import { ApiMethod } from './ApiMethod';

import { User } from '../types';
import { BotService } from '../bot';

export class GetMe extends ApiMethod<null, User> {
  protected readonly methodName = 'getMe';
  protected readonly isFormData = false;

  constructor(public botService: BotService) {
    super(botService.token, null);
  }
}

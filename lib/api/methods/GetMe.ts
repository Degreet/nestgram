import { ApiMethod } from './ApiMethod';

import { User } from '../../types';
import { BotService } from '../bot.service';

export class GetMe extends ApiMethod<null, User> {
  protected readonly methodName = 'getMe';

  constructor(readonly botService: BotService) {
    super(botService.token, null);
  }
}

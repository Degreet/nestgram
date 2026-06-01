import { ApiMethod } from './api-method';

import { User } from '../../events/user';
import { BotService } from '../bot.service';

export class GetMe extends ApiMethod<null, User> {
  protected readonly methodName = 'getMe';

  constructor(readonly botService: BotService) {
    super(botService.token, null);
  }
}

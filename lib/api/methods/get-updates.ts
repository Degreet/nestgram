import { ApiMethod } from './api-method';
import { Update } from '../update.types';
import { BotService } from '../bot.service';

export interface GetUpdatesOptions {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowed_updates?: string[];
}

export class GetUpdates extends ApiMethod<GetUpdatesOptions, Update[]> {
  protected readonly methodName = 'getUpdates';

  constructor(readonly botService: BotService, options?: GetUpdatesOptions) {
    super(botService.token, options);
  }
}

import { ApiMethod } from './ApiMethod';
import { Update } from '../types';
import { BotService } from '../bot';

export interface GetUpdatesOptions {
  offset?: number;
  limit?: number;
  timeout?: number;
  allowed_updates?: string[];
}

export class GetUpdates extends ApiMethod<GetUpdatesOptions, Update[]> {
  protected readonly methodName = 'getUpdates';
  protected readonly isFormData = false;

  constructor(
    public botService: BotService,
    public options?: GetUpdatesOptions,
  ) {
    super(botService.token, options);
  }
}

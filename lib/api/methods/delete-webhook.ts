import { ApiMethod } from './api-method';
import { BotService } from '../bot.service';

export interface DeleteWebhookOptions {
  drop_pending_updates?: boolean;
}

export class DeleteWebhook extends ApiMethod<DeleteWebhookOptions, true> {
  protected readonly methodName = 'deleteWebhook';

  constructor(readonly botService: BotService, options?: DeleteWebhookOptions) {
    super(botService.token, options);
  }
}

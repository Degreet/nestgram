import { ApiMethod } from './ApiMethod';
import { BotService } from '../bot';

export interface DeleteWebhookOptions {
  drop_pending_updates?: boolean;
}

export class DeleteWebhook extends ApiMethod<DeleteWebhookOptions, true> {
  protected readonly methodName = 'deleteWebhook';
  protected readonly isFormData = false;

  constructor(
    public botService: BotService,
    public options?: DeleteWebhookOptions,
  ) {
    super(botService.token, options);
  }
}

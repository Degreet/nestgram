import { ApiMethod } from './ApiMethod';

export interface DeleteWebhookOptions {
  drop_pending_updates?: boolean;
}

export class DeleteWebhook extends ApiMethod<DeleteWebhookOptions, true> {
  protected readonly methodName = 'deleteWebhook';
  protected readonly isFormData = false;

  constructor(token: string, options?: DeleteWebhookOptions) {
    super(token, options);
  }
}

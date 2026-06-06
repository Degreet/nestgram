import { ApiMethod } from './api-method';

export interface DeleteWebhookOptions {
  drop_pending_updates?: boolean;
}

export class DeleteWebhook extends ApiMethod<DeleteWebhookOptions, true> {
  readonly method = 'deleteWebhook';

  readonly throttled = false;

  constructor(payload?: DeleteWebhookOptions) {
    super(payload);
  }
}

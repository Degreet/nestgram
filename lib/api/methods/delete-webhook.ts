import { ApiMethod } from './api-method';

export interface DeleteWebhookOptions {
  drop_pending_updates?: boolean;
}

/**
 * Use this method to remove webhook integration if you decide to switch back to getUpdates. Returns True on success.
 * @see https://core.telegram.org/bots/api#deletewebhook
 */
export class DeleteWebhook extends ApiMethod<DeleteWebhookOptions, true> {
  readonly method = 'deleteWebhook';

  constructor(payload?: DeleteWebhookOptions) {
    super(payload);
  }
}

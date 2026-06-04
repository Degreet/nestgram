import { ApiMethod } from './api-method';

export interface SetWebhookOptions {
  url: string;
  secret_token?: string;
  allowed_updates?: string[];
  drop_pending_updates?: boolean;
  max_connections?: number;
  ip_address?: string;
}

/** Registers a webhook URL with Telegram. Returns `true` on success. */
export class SetWebhook extends ApiMethod<SetWebhookOptions, true> {
  readonly method = 'setWebhook';

  constructor(payload: SetWebhookOptions) {
    super(payload);
  }
}

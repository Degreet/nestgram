import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { InputFile } from '../input-file';

export interface SetWebhookOptions {
  url: string;
  certificate?: InputFile;
  ip_address?: string;
  max_connections?: number;
  allowed_updates?: string[];
  drop_pending_updates?: boolean;
  secret_token?: string;
}

export class SetWebhook extends ApiMethod<SetWebhookOptions, true> {
  readonly method = 'setWebhook';

  constructor(payload: SetWebhookOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

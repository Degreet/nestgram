import { ApiMethod } from './api-method';
import type { RawWebhookInfo } from '../../events/raw-update.types';

export class GetWebhookInfo extends ApiMethod<null, RawWebhookInfo> {
  readonly method = 'getWebhookInfo';

  constructor() {
    super(null);
  }
}

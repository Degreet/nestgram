import { ApiMethod } from './api-method';
import type { RawWebhookInfo } from '../../events/raw-update.types';

export class GetWebhookInfo extends ApiMethod<null, RawWebhookInfo> {
  readonly method = 'getWebhookInfo';

  readonly throttled = false;

  constructor() {
    super(null);
  }
}

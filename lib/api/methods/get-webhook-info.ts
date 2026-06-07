import { ApiMethod } from './api-method';
import type { RawWebhookInfo } from '../../events/raw-update.types';

/**
 * Use this method to get current webhook status. Requires no parameters. On success, returns a WebhookInfo object. If the bot is using getUpdates, will return an object with the url field empty.
 * @see https://core.telegram.org/bots/api#getwebhookinfo
 */
export class GetWebhookInfo extends ApiMethod<null, RawWebhookInfo> {
  readonly method = 'getWebhookInfo';

  constructor() {
    super(null);
  }
}

import { ApiMethod } from './api-method';
import type { RawStarAmount } from '../../events/raw-update.types';

/**
 * A method to get the current Telegram Stars balance of the bot. Requires no parameters. On success, returns a StarAmount object.
 * @see https://core.telegram.org/bots/api#getmystarbalance
 */
export class GetMyStarBalance extends ApiMethod<null, RawStarAmount> {
  readonly method = 'getMyStarBalance';

  constructor() {
    super(null);
  }
}

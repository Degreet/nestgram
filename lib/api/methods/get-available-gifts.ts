import { ApiMethod } from './api-method';
import type { RawGifts } from '../../events/raw-update.types';

/**
 * Returns the list of gifts that can be sent by the bot to users and channel chats. Requires no parameters. Returns a Gifts object.
 * @see https://core.telegram.org/bots/api#getavailablegifts
 */
export class GetAvailableGifts extends ApiMethod<null, RawGifts> {
  readonly method = 'getAvailableGifts';

  constructor() {
    super(null);
  }
}

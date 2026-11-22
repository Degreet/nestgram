import { ApiMethod } from './api-method';
import type { RawBotFullInfo } from '../../events/raw-update.types';

/**
 * A simple method for testing your bot's authentication token. Requires no parameters. Returns information about the bot in form of a BotFullInfo object.
 * @see https://core.telegram.org/bots/api#getme
 */
export class GetMe extends ApiMethod<null, RawBotFullInfo> {
  readonly method = 'getMe';

  constructor() {
    super(null);
  }
}

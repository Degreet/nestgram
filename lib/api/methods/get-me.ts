import { ApiMethod } from './api-method';
import type { User } from '../../events/user';

/**
 * A simple method for testing your bot's authentication token. Requires no parameters. Returns basic information about the bot in form of a User object.
 * @see https://core.telegram.org/bots/api#getme
 */
export class GetMe extends ApiMethod<null, User> {
  readonly method = 'getMe';

  constructor() {
    super(null);
  }
}

import { ApiMethod } from './api-method';

/**
 * Removes the profile photo of the bot. Requires no parameters. Returns True on success.
 * @see https://core.telegram.org/bots/api#removemyprofilephoto
 */
export class RemoveMyProfilePhoto extends ApiMethod<null, true> {
  readonly method = 'removeMyProfilePhoto';

  constructor() {
    super(null);
  }
}

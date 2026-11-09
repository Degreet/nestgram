import { ApiMethod } from './api-method';
import type { RawChatShareThemeBackdrops } from '../../events/raw-update.types';

/**
 * Use this method to get the list of backdrops, which can be used as the background of a theme of the screen for sharing a link to a user or a chat. Requires no parameters. Returns a ChatShareThemeBackdrops object.
 * @see https://core.telegram.org/bots/api#getchatsharethemebackdrops
 */
export class GetChatShareThemeBackdrops extends ApiMethod<
  null,
  RawChatShareThemeBackdrops
> {
  readonly method = 'getChatShareThemeBackdrops';

  constructor() {
    super(null);
  }
}

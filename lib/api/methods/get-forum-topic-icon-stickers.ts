import { ApiMethod } from './api-method';
import type { RawSticker } from '../../events/raw-update.types';

/**
 * Use this method to get custom emoji stickers, which can be used as a forum topic icon by any user. Requires no parameters. Returns an Array of Sticker objects.
 * @see https://core.telegram.org/bots/api#getforumtopiciconstickers
 */
export class GetForumTopicIconStickers extends ApiMethod<null, RawSticker[]> {
  readonly method = 'getForumTopicIconStickers';

  constructor() {
    super(null);
  }
}

import { ApiMethod } from './api-method';
import type { RawSticker } from '../../events/raw-update.types';

export interface GetCustomEmojiStickersOptions {
  custom_emoji_ids: string[];
}

/**
 * Use this method to get information about custom emoji stickers by their identifiers. Returns an Array of Sticker objects.
 * @see https://core.telegram.org/bots/api#getcustomemojistickers
 */
export class GetCustomEmojiStickers extends ApiMethod<
  GetCustomEmojiStickersOptions,
  RawSticker[]
> {
  readonly method = 'getCustomEmojiStickers';

  constructor(payload: GetCustomEmojiStickersOptions) {
    super(payload);
  }
}

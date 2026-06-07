import { ApiMethod } from './api-method';

export interface SetCustomEmojiStickerSetThumbnailOptions {
  name: string;
  custom_emoji_id?: string;
}

/**
 * Use this method to set the thumbnail of a custom emoji sticker set. Returns True on success.
 * @see https://core.telegram.org/bots/api#setcustomemojistickersetthumbnail
 */
export class SetCustomEmojiStickerSetThumbnail extends ApiMethod<
  SetCustomEmojiStickerSetThumbnailOptions,
  true
> {
  readonly method = 'setCustomEmojiStickerSetThumbnail';

  constructor(payload: SetCustomEmojiStickerSetThumbnailOptions) {
    super(payload);
  }
}

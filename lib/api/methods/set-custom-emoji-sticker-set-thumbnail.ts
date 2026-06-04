import { ApiMethod } from './api-method';

export interface SetCustomEmojiStickerSetThumbnailOptions {
  name: string;
  custom_emoji_id?: string;
}

export class SetCustomEmojiStickerSetThumbnail extends ApiMethod<
  SetCustomEmojiStickerSetThumbnailOptions,
  true
> {
  readonly method = 'setCustomEmojiStickerSetThumbnail';

  constructor(payload: SetCustomEmojiStickerSetThumbnailOptions) {
    super(payload);
  }
}

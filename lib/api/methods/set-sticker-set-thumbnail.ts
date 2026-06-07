import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { InputFile } from '../input-file';

export interface SetStickerSetThumbnailOptions {
  name: string;
  user_id: number;
  thumbnail?: InputFile | string;
  format: 'static' | 'animated' | 'video';
}

/**
 * Use this method to set the thumbnail of a regular or mask sticker set. The format of the thumbnail file must match the format of the stickers in the set. Returns True on success.
 * @see https://core.telegram.org/bots/api#setstickersetthumbnail
 */
export class SetStickerSetThumbnail extends ApiMethod<
  SetStickerSetThumbnailOptions,
  true
> {
  readonly method = 'setStickerSetThumbnail';

  constructor(payload: SetStickerSetThumbnailOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

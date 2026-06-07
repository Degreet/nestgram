import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { RawInputSticker } from '../../events/raw-update.types';

export interface ReplaceStickerInSetOptions {
  user_id: number;
  name: string;
  old_sticker: string;
  sticker: RawInputSticker;
}

/**
 * Use this method to replace an existing sticker in a sticker set with a new one. The method is equivalent to calling deleteStickerFromSet, then addStickerToSet, then setStickerPositionInSet. Returns True on success.
 * @see https://core.telegram.org/bots/api#replacestickerinset
 */
export class ReplaceStickerInSet extends ApiMethod<
  ReplaceStickerInSetOptions,
  true
> {
  readonly method = 'replaceStickerInSet';

  readonly isAttachMedia = true;

  constructor(payload: ReplaceStickerInSetOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

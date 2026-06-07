import { ApiMethod } from './api-method';
import type { RawStickerSet } from '../../events/raw-update.types';

export interface GetStickerSetOptions {
  name: string;
}

/**
 * Use this method to get a sticker set. On success, a StickerSet object is returned.
 * @see https://core.telegram.org/bots/api#getstickerset
 */
export class GetStickerSet extends ApiMethod<
  GetStickerSetOptions,
  RawStickerSet
> {
  readonly method = 'getStickerSet';

  constructor(payload: GetStickerSetOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { RawInputSticker } from '../../events/raw-update.types';

export interface AddStickerToSetOptions {
  user_id: number;
  name: string;
  sticker: RawInputSticker;
}

/**
 * Use this method to add a new sticker to a set created by the bot. Emoji sticker sets can have up to 200 stickers. Other sticker sets can have up to 120 stickers. Returns True on success.
 * @see https://core.telegram.org/bots/api#addstickertoset
 */
export class AddStickerToSet extends ApiMethod<AddStickerToSetOptions, true> {
  readonly method = 'addStickerToSet';

  readonly isAttachMedia = true;

  constructor(payload: AddStickerToSetOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

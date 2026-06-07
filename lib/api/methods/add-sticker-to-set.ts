import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { RawInputSticker } from '../../events/raw-update.types';

export interface AddStickerToSetOptions {
  user_id: number;
  name: string;
  sticker: RawInputSticker;
}

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

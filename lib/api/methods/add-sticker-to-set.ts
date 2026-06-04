import { ApiMethod } from './api-method';
import type { RawInputSticker } from '../../events/raw-update.types';

export interface AddStickerToSetOptions {
  user_id: number;
  name: string;
  sticker: RawInputSticker;
}

export class AddStickerToSet extends ApiMethod<AddStickerToSetOptions, true> {
  readonly method = 'addStickerToSet';

  constructor(payload: AddStickerToSetOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type { RawInputSticker } from '../../events/raw-update.types';

export interface ReplaceStickerInSetOptions {
  user_id: number;
  name: string;
  old_sticker: string;
  sticker: RawInputSticker;
}

export class ReplaceStickerInSet extends ApiMethod<
  ReplaceStickerInSetOptions,
  true
> {
  readonly method = 'replaceStickerInSet';

  constructor(payload: ReplaceStickerInSetOptions) {
    super(payload);
  }
}

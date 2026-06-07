import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
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

  readonly isAttachMedia = true;

  constructor(payload: ReplaceStickerInSetOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

import { ApiMethod } from './api-method';
import { InputFile } from '../input-file';
import type { RawInputSticker } from '../../events/raw-update.types';

export interface CreateNewStickerSetOptions {
  user_id: number;
  name: string;
  title: string;
  stickers: RawInputSticker[];
  sticker_type?: string;
  needs_repainting?: boolean;
}

export class CreateNewStickerSet extends ApiMethod<
  CreateNewStickerSetOptions,
  true
> {
  readonly method = 'createNewStickerSet';

  readonly isAttachMedia = true;

  constructor(payload: CreateNewStickerSetOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return (
      this.payload?.stickers.some(
        (item) => item.sticker instanceof InputFile,
      ) ?? false
    );
  }
}

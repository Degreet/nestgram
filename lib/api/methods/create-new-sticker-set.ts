import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
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
    return hasInputFile(this.payload);
  }
}

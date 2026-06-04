import { ApiMethod } from './api-method';
import type { RawInputSticker } from '../../events/raw-update.types';

export interface CreateNewStickerSetOptions {
  user_id: number;
  name: string;
  title: string;
  stickers: RawInputSticker[];
  sticker_type?: 'mask' | 'custom_emoji';
  needs_repainting?: boolean;
}

export class CreateNewStickerSet extends ApiMethod<
  CreateNewStickerSetOptions,
  true
> {
  readonly method = 'createNewStickerSet';

  constructor(payload: CreateNewStickerSetOptions) {
    super(payload);
  }
}

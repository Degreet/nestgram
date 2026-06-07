import { ApiMethod } from './api-method';
import { InputFile } from '../input-file';

export interface SetStickerSetThumbnailOptions {
  name: string;
  user_id: number;
  thumbnail?: InputFile | string;
  format: string;
}

export class SetStickerSetThumbnail extends ApiMethod<
  SetStickerSetThumbnailOptions,
  true
> {
  readonly method = 'setStickerSetThumbnail';

  constructor(payload: SetStickerSetThumbnailOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return this.payload?.thumbnail instanceof InputFile;
  }
}

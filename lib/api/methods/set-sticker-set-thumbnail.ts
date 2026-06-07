import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { InputFile } from '../input-file';

export interface SetStickerSetThumbnailOptions {
  name: string;
  user_id: number;
  thumbnail?: InputFile | string;
  format: 'static' | 'animated' | 'video';
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
    return hasInputFile(this.payload);
  }
}

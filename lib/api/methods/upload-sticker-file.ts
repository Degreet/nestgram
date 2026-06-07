import { ApiMethod } from './api-method';
import { InputFile } from '../input-file';
import type { RawFile } from '../../events/raw-update.types';

export interface UploadStickerFileOptions {
  user_id: number;
  sticker: InputFile;
  sticker_format: string;
}

export class UploadStickerFile extends ApiMethod<
  UploadStickerFileOptions,
  RawFile
> {
  readonly method = 'uploadStickerFile';

  constructor(payload: UploadStickerFileOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return this.payload?.sticker instanceof InputFile;
  }
}

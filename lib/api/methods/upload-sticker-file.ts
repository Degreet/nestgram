import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { InputFile } from '../input-file';
import type { RawFile } from '../../events/raw-update.types';

export interface UploadStickerFileOptions {
  user_id: number;
  sticker: InputFile;
  sticker_format: 'static' | 'animated' | 'video';
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
    return hasInputFile(this.payload);
  }
}

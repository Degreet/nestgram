import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { InputFile } from '../input-file';
import type { RawFile } from '../../events/raw-update.types';

export interface UploadStickerFileOptions {
  user_id: number;
  sticker: InputFile;
  sticker_format: 'static' | 'animated' | 'video';
}

/**
 * Use this method to upload a file with a sticker for later use in the createNewStickerSet, addStickerToSet, or replaceStickerInSet methods (the file can be used multiple times). Returns the uploaded File on success.
 * @see https://core.telegram.org/bots/api#uploadstickerfile
 */
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

import { ApiMethod } from './api-method';

export interface DeleteStickerSetOptions {
  name: string;
}

export class DeleteStickerSet extends ApiMethod<DeleteStickerSetOptions, true> {
  readonly method = 'deleteStickerSet';

  constructor(payload: DeleteStickerSetOptions) {
    super(payload);
  }
}

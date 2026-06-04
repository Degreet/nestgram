import { ApiMethod } from './api-method';

export interface DeleteStickerFromSetOptions {
  sticker: string;
}

export class DeleteStickerFromSet extends ApiMethod<
  DeleteStickerFromSetOptions,
  true
> {
  readonly method = 'deleteStickerFromSet';

  constructor(payload: DeleteStickerFromSetOptions) {
    super(payload);
  }
}

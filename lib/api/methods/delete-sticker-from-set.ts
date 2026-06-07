import { ApiMethod } from './api-method';

export interface DeleteStickerFromSetOptions {
  sticker: string;
}

/**
 * Use this method to delete a sticker from a set created by the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#deletestickerfromset
 */
export class DeleteStickerFromSet extends ApiMethod<
  DeleteStickerFromSetOptions,
  true
> {
  readonly method = 'deleteStickerFromSet';

  constructor(payload: DeleteStickerFromSetOptions) {
    super(payload);
  }
}

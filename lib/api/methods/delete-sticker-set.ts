import { ApiMethod } from './api-method';

export interface DeleteStickerSetOptions {
  name: string;
}

/**
 * Use this method to delete a sticker set that was created by the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#deletestickerset
 */
export class DeleteStickerSet extends ApiMethod<DeleteStickerSetOptions, true> {
  readonly method = 'deleteStickerSet';

  constructor(payload: DeleteStickerSetOptions) {
    super(payload);
  }
}

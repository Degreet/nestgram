import { ApiMethod } from './api-method';

export interface SetStickerSetTitleOptions {
  name: string;
  title: string;
}

/**
 * Use this method to set the title of a created sticker set. Returns True on success.
 * @see https://core.telegram.org/bots/api#setstickersettitle
 */
export class SetStickerSetTitle extends ApiMethod<
  SetStickerSetTitleOptions,
  true
> {
  readonly method = 'setStickerSetTitle';

  constructor(payload: SetStickerSetTitleOptions) {
    super(payload);
  }
}

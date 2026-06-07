import { ApiMethod } from './api-method';

export interface SetStickerKeywordsOptions {
  sticker: string;
  keywords?: string[];
}

/**
 * Use this method to change search keywords assigned to a regular or custom emoji sticker. The sticker must belong to a sticker set created by the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#setstickerkeywords
 */
export class SetStickerKeywords extends ApiMethod<
  SetStickerKeywordsOptions,
  true
> {
  readonly method = 'setStickerKeywords';

  constructor(payload: SetStickerKeywordsOptions) {
    super(payload);
  }
}

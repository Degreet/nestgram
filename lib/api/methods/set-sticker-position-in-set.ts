import { ApiMethod } from './api-method';

export interface SetStickerPositionInSetOptions {
  sticker: string;
  position: number;
}

/**
 * Use this method to move a sticker in a set created by the bot to a specific position. Returns True on success.
 * @see https://core.telegram.org/bots/api#setstickerpositioninset
 */
export class SetStickerPositionInSet extends ApiMethod<
  SetStickerPositionInSetOptions,
  true
> {
  readonly method = 'setStickerPositionInSet';

  constructor(payload: SetStickerPositionInSetOptions) {
    super(payload);
  }
}

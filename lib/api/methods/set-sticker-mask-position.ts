import { ApiMethod } from './api-method';
import type { RawMaskPosition } from '../../events/raw-update.types';

export interface SetStickerMaskPositionOptions {
  sticker: string;
  mask_position?: RawMaskPosition;
}

/**
 * Use this method to change the mask position of a mask sticker. The sticker must belong to a sticker set that was created by the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#setstickermaskposition
 */
export class SetStickerMaskPosition extends ApiMethod<
  SetStickerMaskPositionOptions,
  true
> {
  readonly method = 'setStickerMaskPosition';

  constructor(payload: SetStickerMaskPositionOptions) {
    super(payload);
  }
}

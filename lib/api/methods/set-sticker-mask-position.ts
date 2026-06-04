import { ApiMethod } from './api-method';
import type { RawMaskPosition } from '../../events/raw-update.types';

export interface SetStickerMaskPositionOptions {
  sticker: string;
  mask_position?: RawMaskPosition;
}

export class SetStickerMaskPosition extends ApiMethod<
  SetStickerMaskPositionOptions,
  true
> {
  readonly method = 'setStickerMaskPosition';

  constructor(payload: SetStickerMaskPositionOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface SetStickerPositionInSetOptions {
  sticker: string;
  position: number;
}

export class SetStickerPositionInSet extends ApiMethod<
  SetStickerPositionInSetOptions,
  true
> {
  readonly method = 'setStickerPositionInSet';

  constructor(payload: SetStickerPositionInSetOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface SetStickerSetTitleOptions {
  name: string;
  title: string;
}

export class SetStickerSetTitle extends ApiMethod<
  SetStickerSetTitleOptions,
  true
> {
  readonly method = 'setStickerSetTitle';

  constructor(payload: SetStickerSetTitleOptions) {
    super(payload);
  }
}

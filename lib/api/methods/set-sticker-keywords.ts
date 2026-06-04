import { ApiMethod } from './api-method';

export interface SetStickerKeywordsOptions {
  sticker: string;
  keywords?: string[];
}

export class SetStickerKeywords extends ApiMethod<
  SetStickerKeywordsOptions,
  true
> {
  readonly method = 'setStickerKeywords';

  constructor(payload: SetStickerKeywordsOptions) {
    super(payload);
  }
}

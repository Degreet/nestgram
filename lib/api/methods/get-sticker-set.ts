import { ApiMethod } from './api-method';
import type { RawStickerSet } from '../../events/raw-update.types';

export interface GetStickerSetOptions {
  name: string;
}

export class GetStickerSet extends ApiMethod<
  GetStickerSetOptions,
  RawStickerSet
> {
  readonly method = 'getStickerSet';

  constructor(payload: GetStickerSetOptions) {
    super(payload);
  }
}

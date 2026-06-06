import { ApiMethod } from './api-method';
import type { RawSticker } from '../../events/raw-update.types';

export interface GetCustomEmojiStickersOptions {
  custom_emoji_ids: string[];
}

export class GetCustomEmojiStickers extends ApiMethod<
  GetCustomEmojiStickersOptions,
  RawSticker[]
> {
  readonly method = 'getCustomEmojiStickers';

  readonly throttled = false;

  constructor(payload: GetCustomEmojiStickersOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface SetStickerEmojiListOptions {
  sticker: string;
  emoji_list: string[];
}

export class SetStickerEmojiList extends ApiMethod<
  SetStickerEmojiListOptions,
  true
> {
  readonly method = 'setStickerEmojiList';

  constructor(payload: SetStickerEmojiListOptions) {
    super(payload);
  }
}

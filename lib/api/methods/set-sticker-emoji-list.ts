import { ApiMethod } from './api-method';

export interface SetStickerEmojiListOptions {
  sticker: string;
  emoji_list: string[];
}

/**
 * Use this method to change the list of emoji assigned to a regular or custom emoji sticker. The sticker must belong to a sticker set created by the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#setstickeremojilist
 */
export class SetStickerEmojiList extends ApiMethod<
  SetStickerEmojiListOptions,
  true
> {
  readonly method = 'setStickerEmojiList';

  constructor(payload: SetStickerEmojiListOptions) {
    super(payload);
  }
}

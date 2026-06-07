import { ApiMethod } from './api-method';

export interface SetChatStickerSetOptions {
  chat_id: number | string;
  sticker_set_name: string;
}

/**
 * Use this method to set a new group sticker set for a supergroup. The bot must be an administrator in the chat for this to work and must have the appropriate administrator rights. Use the field can_set_sticker_set optionally returned in getChat requests to check if the bot can use this method. Returns True on success.
 * @see https://core.telegram.org/bots/api#setchatstickerset
 */
export class SetChatStickerSet extends ApiMethod<
  SetChatStickerSetOptions,
  true
> {
  readonly method = 'setChatStickerSet';

  constructor(payload: SetChatStickerSetOptions) {
    super(payload);
  }
}

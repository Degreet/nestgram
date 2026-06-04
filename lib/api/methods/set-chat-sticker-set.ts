import { ApiMethod } from './api-method';

export interface SetChatStickerSetOptions {
  chat_id: number | string;
  sticker_set_name: string;
}

export class SetChatStickerSet extends ApiMethod<
  SetChatStickerSetOptions,
  true
> {
  readonly method = 'setChatStickerSet';

  constructor(payload: SetChatStickerSetOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface DeleteChatStickerSetOptions {
  chat_id: number | string;
}

export class DeleteChatStickerSet extends ApiMethod<
  DeleteChatStickerSetOptions,
  true
> {
  readonly method = 'deleteChatStickerSet';

  constructor(payload: DeleteChatStickerSetOptions) {
    super(payload);
  }
}

import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class DeleteChatStickerSet extends MessageCreator {
  sendType: SendTypes = 'deleteChatStickerSet';
  type: MessageCreatorTypes = 'text';

  /**
   * Delete chat sticker set
   * @param chatId Optional. Chat ID you want to delete sticker set. Current chat id by default
   * @see https://core.telegram.org/bots/api#deletechatstickerset
   * */
  constructor(public readonly chatId?: number | string) {
    super({});
  }
}

import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class ChatStickerSet extends MessageCreator {
  sendType: SendTypes = 'setChatStickerSet';
  type: MessageCreatorTypes = 'text';

  /**
   * Set chat sticker set
   * @param stickerSetName Sticker set name you want to set
   * @param chatId Optional. Chat ID you want to set sticker set. Current chat id by default
   * @see https://core.telegram.org/bots/api#setchatstickerset
   * */
  constructor(public readonly stickerSetName: string, public readonly chatId?: number | string) {
    super({});
  }
}

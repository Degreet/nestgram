import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class Unpin extends MessageCreator {
  sendType: SendTypes = 'unpin';
  type: MessageCreatorTypes = 'text';

  /**
   * Unpin chat message
   * @param msgId Message ID you want to unpin
   * @param chatId Optional. Chat ID where you want to unpin message. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#unpinchatmessage
   * */
  constructor(public readonly msgId: number, public readonly chatId?: number | string) {
    super({});
  }
}

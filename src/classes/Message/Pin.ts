import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class Pin extends MessageCreator {
  sendType: SendTypes = 'pin';
  type: MessageCreatorTypes = 'text';

  /**
   * Pin chat message
   * @param disableNotification Optional. Disable notification for all chat users that you have pinned a message
   * @param msgId Optional. Message ID you want to pin. Current message id by default
   * @param chatId Optional. Chat ID where you want to pin message. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#pinchatmessage
   * */
  constructor(
    public readonly disableNotification?: boolean,
    public readonly msgId?: number,
    public readonly chatId?: number | string,
  ) {
    super({});
  }
}

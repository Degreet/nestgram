import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class Pin extends MessageCreator {
  sendType: SendTypes = 'pin';
  type: MessageCreatorTypes = 'text';

  /**
   * Pin chat message
   * @param msgId Optional. Message ID you want to pin. Current message id by default
   * @param chatId Optional. Chat ID where you want to pin message. It can be id of group/channel or ID of the user. Current chat id by default
   * @param disableNotification Optional. Disable notification for all chat users that you have pinned a message
   * @see https://core.telegram.org/bots/api#pinchatmessage
   * */
  constructor(
    public readonly msgId?: number | null,
    public readonly chatId?: number | string | null,
    public readonly disableNotification?: boolean,
  ) {
    super({});
  }
}

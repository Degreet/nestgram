import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class ChatDescription extends MessageCreator {
  sendType: SendTypes = 'setChatDescription';
  type: MessageCreatorTypes = 'text';

  /**
   * Set chat title
   * @param description Description you want to set for the chat
   * @param chatId Optional. Chat ID where you want to set chat description. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#setchatdescription
   * */
  constructor(public readonly description: string, public readonly chatId?: number | string) {
    super({});
  }
}

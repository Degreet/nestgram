import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class ChatTitle extends MessageCreator {
  sendType: SendTypes = 'setChatTitle';
  type: MessageCreatorTypes = 'text';

  /**
   * Set chat title
   * @param title Title you want to set for the chat
   * @param chatId Optional. Chat ID where you want to set chat title. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#setchattitle
   * */
  constructor(public readonly title: string, public readonly chatId?: number | string) {
    super({});
  }
}

import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class Delete extends MessageCreator {
  sendType: SendTypes = 'delete';
  type: MessageCreatorTypes = 'text';

  /**
   * Delete a message
   * @param msgId Optional. Message ID you want to delete. Current message id by default
   * @param chatId Optional. Chat ID in which message you want to delete is located. Current chat id by default
   * @see https://core.telegram.org/bots/api#deletemessage
   * */
  constructor(public readonly msgId?: number, public readonly chatId?: number) {
    super({});
  }
}

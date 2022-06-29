import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class DeleteChatPhoto extends MessageCreator {
  sendType: SendTypes = 'deleteChatPhoto';
  type: MessageCreatorTypes = 'text';

  /**
   * Delete chat photo
   * @param chatId Optional. Chat ID where you want to set chat photo. It can be id of group/channel or ID of the user. Current chat id by default
   * */
  constructor(public readonly chatId?: number | string) {
    super({});
  }
}

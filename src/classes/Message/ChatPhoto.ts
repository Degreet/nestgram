import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';
import { Photo } from '../Media';

export class ChatPhoto extends MessageCreator {
  sendType: SendTypes = 'setChatPhoto';
  type: MessageCreatorTypes = 'text';

  /**
   * Set chat photo
   * @param photo Photo you want to set (you can create it using Photo class)
   * @param chatId Optional. Chat ID where you want to set chat photo. It can be id of group/channel or ID of the user. Current chat id by default
   * */
  constructor(public readonly photo: Photo, public readonly chatId?: number | string) {
    super({});
  }
}

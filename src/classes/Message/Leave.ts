import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class Leave extends MessageCreator {
  sendType: SendTypes = 'leave';
  type: MessageCreatorTypes = 'text';

  /**
   * Leaves chat
   * @param chatId Optional. Chat ID you want to leave. Current chat id by default
   * @see https://core.telegram.org/bots/api#leavechat
   * */
  constructor(public readonly chatId?: number | string) {
    super({});
  }
}

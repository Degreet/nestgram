import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class DeclineJoinRequest extends MessageCreator {
  sendType: SendTypes = 'declineJoinRequest';
  type: MessageCreatorTypes = 'text';

  /**
   * Approves chat join request
   * @param userId User ID you want to approve join request
   * @param chatId Optional. Chat ID where you want to approve join request. It can be id of group/channel or ID of the user. Current chat id by default
   * @see https://core.telegram.org/bots/api#approvechatjoinrequest
   * */
  constructor(public readonly userId: number, public readonly chatId?: number | string) {
    super({});
  }
}

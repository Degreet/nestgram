import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class Unban extends MessageCreator {
  sendType: SendTypes = 'unban';
  type: MessageCreatorTypes = 'text';

  /**
   * Unban chat member
   * @param onlyIfBanned Do nothing if the user is not banned
   * @param userId User id you want to promote
   * @see https://core.telegram.org/bots/api#unbanchatmember
   * */
  constructor(public readonly onlyIfBanned?: boolean, public readonly userId?: number) {
    super({});
  }
}

import { MessageCreator } from './MessageCreator';
import { MessageCreatorTypes, SendTypes } from '../../types';

export class Ban extends MessageCreator {
  sendType: SendTypes = 'ban';
  type: MessageCreatorTypes = 'text';

  /**
   * Ban chat member
   * @param untilDate Ban end date
   * @param revokeMessages Remove all messages by this user
   * @param userId User id you want to promote
   * @see https://core.telegram.org/bots/api#banchatmember
   * */
  constructor(
    public readonly untilDate?: number,
    public readonly revokeMessages?: boolean,
    public readonly userId?: number,
  ) {
    super({});
  }
}

import { MessageCreator } from './MessageCreator';
import { IChatPermissions, MessageCreatorTypes, SendTypes } from '../../types';

export class Restrict extends MessageCreator {
  sendType: SendTypes = 'restrict';
  type: MessageCreatorTypes = 'text';

  /**
   * Restrict chat member
   * @param permissions Permissions you grant to the user {@link IChatPermissions}
   * @param userId User id you want to restrict
   * @param untilDate Ban end date
   * @see https://core.telegram.org/bots/api#restrictchatmember
   * @return true on success
   * */
  constructor(
    public readonly permissions: IChatPermissions,
    public readonly userId?: number,
    public readonly untilDate?: number,
  ) {
    super({});
  }
}

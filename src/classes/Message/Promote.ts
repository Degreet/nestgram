import { MessageCreator } from './MessageCreator';
import { IPromoteChatPermissions, MessageCreatorTypes, SendTypes } from '../../types';

export class Promote extends MessageCreator {
  sendType: SendTypes = 'promote';
  type: MessageCreatorTypes = 'text';

  /**
   * Promote chat member
   * @param permissions Permissions you grant to the user {@link IPromoteChatPermissions}
   * @see https://core.telegram.org/bots/api#promotechatmember
   * @return true on success
   * */
  constructor(public readonly permissions: IPromoteChatPermissions) {
    super({});
  }
}

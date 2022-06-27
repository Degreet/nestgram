import { MessageCreator } from './MessageCreator';
import { IChatPermissions, MessageCreatorTypes, SendTypes } from '../../types';

export class ChatPermissions extends MessageCreator {
  sendType: SendTypes = 'setChatPermissions';
  type: MessageCreatorTypes = 'text';

  /**
   * Set chat permissions
   * @param permissions Chat permissions you want to set {@link IChatPermissions}
   * @see https://core.telegram.org/bots/api#setchatpermissions
   * @return true on success
   * */
  constructor(public readonly permissions: IChatPermissions) {
    super({});
  }
}

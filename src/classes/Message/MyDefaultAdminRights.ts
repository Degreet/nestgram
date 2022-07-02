import { MessageCreator } from './MessageCreator';
import { IChatAdministratorRights, MessageCreatorTypes, SendTypes } from '../../types';

export class MyDefaultAdminRights extends MessageCreator {
  sendType: SendTypes = 'setMyDefaultAdminRights';
  type: MessageCreatorTypes = 'text';

  /**
   * Set my default administrator rights
   * @param rights Optional. Rights you want to set as default
   * @param forChannels Optional. Pass true to get default administrator rights of the bot in channels. Otherwise, default administrator rights of the bot for groups and supergroups will be returned
   * @see https://core.telegram.org/bots/api#setmydefaultadministratorrights
   * */
  constructor(
    public readonly rights?: IChatAdministratorRights,
    public readonly forChannels?: boolean,
  ) {
    super({});
  }
}

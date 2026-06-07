import { ApiMethod } from './api-method';
import type { RawChatAdministratorRights } from '../../events/raw-update.types';

export interface SetMyDefaultAdministratorRightsOptions {
  rights?: RawChatAdministratorRights;
  for_channels?: boolean;
}

/**
 * Use this method to change the default administrator rights requested by the bot when it's added as an administrator to groups or channels. These rights will be suggested to users, but they are free to modify the list before adding the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#setmydefaultadministratorrights
 */
export class SetMyDefaultAdministratorRights extends ApiMethod<
  SetMyDefaultAdministratorRightsOptions,
  true
> {
  readonly method = 'setMyDefaultAdministratorRights';

  constructor(payload?: SetMyDefaultAdministratorRightsOptions) {
    super(payload);
  }
}

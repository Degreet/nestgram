import { ApiMethod } from './api-method';
import type { RawChatAdministratorRights } from '../../events/raw-update.types';

export interface GetMyDefaultAdministratorRightsOptions {
  for_channels?: boolean;
}

/**
 * Use this method to get the current default administrator rights of the bot. Returns ChatAdministratorRights on success.
 * @see https://core.telegram.org/bots/api#getmydefaultadministratorrights
 */
export class GetMyDefaultAdministratorRights extends ApiMethod<
  GetMyDefaultAdministratorRightsOptions,
  RawChatAdministratorRights
> {
  readonly method = 'getMyDefaultAdministratorRights';

  constructor(payload?: GetMyDefaultAdministratorRightsOptions) {
    super(payload);
  }
}

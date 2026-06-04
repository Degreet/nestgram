import { ApiMethod } from './api-method';
import type { RawChatAdministratorRights } from '../../events/raw-update.types';

export interface SetMyDefaultAdministratorRightsOptions {
  rights?: RawChatAdministratorRights;
  for_channels?: boolean;
}

export class SetMyDefaultAdministratorRights extends ApiMethod<
  SetMyDefaultAdministratorRightsOptions,
  true
> {
  readonly method = 'setMyDefaultAdministratorRights';

  constructor(payload?: SetMyDefaultAdministratorRightsOptions) {
    super(payload);
  }
}

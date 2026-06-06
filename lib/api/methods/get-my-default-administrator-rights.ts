import { ApiMethod } from './api-method';
import type { RawChatAdministratorRights } from '../../events/raw-update.types';

export interface GetMyDefaultAdministratorRightsOptions {
  for_channels?: boolean;
}

export class GetMyDefaultAdministratorRights extends ApiMethod<
  GetMyDefaultAdministratorRightsOptions,
  RawChatAdministratorRights
> {
  readonly method = 'getMyDefaultAdministratorRights';

  readonly throttled = false;

  constructor(payload?: GetMyDefaultAdministratorRightsOptions) {
    super(payload);
  }
}

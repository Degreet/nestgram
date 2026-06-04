import { ApiMethod } from './api-method';
import type { RawChatPermissions } from '../../events/raw-update.types';

export interface SetChatPermissionsOptions {
  chat_id: number | string;
  permissions: RawChatPermissions;
  use_independent_chat_permissions?: boolean;
}

export class SetChatPermissions extends ApiMethod<
  SetChatPermissionsOptions,
  true
> {
  readonly method = 'setChatPermissions';

  constructor(payload: SetChatPermissionsOptions) {
    super(payload);
  }
}

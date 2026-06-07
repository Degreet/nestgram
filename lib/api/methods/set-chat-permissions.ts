import { ApiMethod } from './api-method';
import type { RawChatPermissions } from '../../events/raw-update.types';

export interface SetChatPermissionsOptions {
  chat_id: number | string;
  permissions: RawChatPermissions;
  use_independent_chat_permissions?: boolean;
}

/**
 * Use this method to set default chat permissions for all members. The bot must be an administrator in the group or a supergroup for this to work and must have the can_restrict_members administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#setchatpermissions
 */
export class SetChatPermissions extends ApiMethod<
  SetChatPermissionsOptions,
  true
> {
  readonly method = 'setChatPermissions';

  constructor(payload: SetChatPermissionsOptions) {
    super(payload);
  }
}

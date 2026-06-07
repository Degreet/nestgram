import { ApiMethod } from './api-method';

export interface SetManagedBotAccessSettingsOptions {
  user_id: number;
  is_access_restricted: boolean;
  added_user_ids?: number[];
}

/**
 * Use this method to change the access settings of a managed bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#setmanagedbotaccesssettings
 */
export class SetManagedBotAccessSettings extends ApiMethod<
  SetManagedBotAccessSettingsOptions,
  true
> {
  readonly method = 'setManagedBotAccessSettings';

  constructor(payload: SetManagedBotAccessSettingsOptions) {
    super(payload);
  }
}

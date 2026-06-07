import { ApiMethod } from './api-method';
import type { RawBotAccessSettings } from '../../events/raw-update.types';

export interface GetManagedBotAccessSettingsOptions {
  user_id: number;
}

/**
 * Use this method to get the access settings of a managed bot. Returns a BotAccessSettings object on success.
 * @see https://core.telegram.org/bots/api#getmanagedbotaccesssettings
 */
export class GetManagedBotAccessSettings extends ApiMethod<
  GetManagedBotAccessSettingsOptions,
  RawBotAccessSettings
> {
  readonly method = 'getManagedBotAccessSettings';

  constructor(payload: GetManagedBotAccessSettingsOptions) {
    super(payload);
  }
}

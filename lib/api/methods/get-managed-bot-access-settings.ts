import { ApiMethod } from './api-method';
import type { RawBotAccessSettings } from '../../events/raw-update.types';

export interface GetManagedBotAccessSettingsOptions {
  user_id: number;
}

export class GetManagedBotAccessSettings extends ApiMethod<
  GetManagedBotAccessSettingsOptions,
  RawBotAccessSettings
> {
  readonly method = 'getManagedBotAccessSettings';

  constructor(payload: GetManagedBotAccessSettingsOptions) {
    super(payload);
  }
}

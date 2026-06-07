import { ApiMethod } from './api-method';

export interface SetManagedBotAccessSettingsOptions {
  user_id: number;
  is_access_restricted: boolean;
  added_user_ids?: number[];
}

export class SetManagedBotAccessSettings extends ApiMethod<
  SetManagedBotAccessSettingsOptions,
  true
> {
  readonly method = 'setManagedBotAccessSettings';

  constructor(payload: SetManagedBotAccessSettingsOptions) {
    super(payload);
  }
}

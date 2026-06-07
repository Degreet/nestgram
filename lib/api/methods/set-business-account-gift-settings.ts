import { ApiMethod } from './api-method';
import type { RawAcceptedGiftTypes } from '../../events/raw-update.types';

export interface SetBusinessAccountGiftSettingsOptions {
  business_connection_id: string;
  show_gift_button: boolean;
  accepted_gift_types: RawAcceptedGiftTypes;
}

export class SetBusinessAccountGiftSettings extends ApiMethod<
  SetBusinessAccountGiftSettingsOptions,
  true
> {
  readonly method = 'setBusinessAccountGiftSettings';

  constructor(payload: SetBusinessAccountGiftSettingsOptions) {
    super(payload);
  }
}

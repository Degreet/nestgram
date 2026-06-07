import { ApiMethod } from './api-method';
import type { RawAcceptedGiftTypes } from '../../events/raw-update.types';

export interface SetBusinessAccountGiftSettingsOptions {
  business_connection_id: string;
  show_gift_button: boolean;
  accepted_gift_types: RawAcceptedGiftTypes;
}

/**
 * Changes the privacy settings pertaining to incoming gifts in a managed business account. Requires the can_change_gift_settings business bot right. Returns True on success.
 * @see https://core.telegram.org/bots/api#setbusinessaccountgiftsettings
 */
export class SetBusinessAccountGiftSettings extends ApiMethod<
  SetBusinessAccountGiftSettingsOptions,
  true
> {
  readonly method = 'setBusinessAccountGiftSettings';

  constructor(payload: SetBusinessAccountGiftSettingsOptions) {
    super(payload);
  }
}

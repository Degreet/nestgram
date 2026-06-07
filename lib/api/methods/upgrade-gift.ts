import { ApiMethod } from './api-method';

export interface UpgradeGiftOptions {
  business_connection_id: string;
  owned_gift_id: string;
  keep_original_details?: boolean;
  star_count?: number;
}

/**
 * Upgrades a given regular gift to a unique gift. Requires the can_transfer_and_upgrade_gifts business bot right. Additionally requires the can_transfer_stars business bot right if the upgrade is paid. Returns True on success.
 * @see https://core.telegram.org/bots/api#upgradegift
 */
export class UpgradeGift extends ApiMethod<UpgradeGiftOptions, true> {
  readonly method = 'upgradeGift';

  constructor(payload: UpgradeGiftOptions) {
    super(payload);
  }
}

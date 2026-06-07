import { ApiMethod } from './api-method';

export interface UpgradeGiftOptions {
  business_connection_id: string;
  owned_gift_id: string;
  keep_original_details?: boolean;
  star_count?: number;
}

export class UpgradeGift extends ApiMethod<UpgradeGiftOptions, true> {
  readonly method = 'upgradeGift';

  constructor(payload: UpgradeGiftOptions) {
    super(payload);
  }
}

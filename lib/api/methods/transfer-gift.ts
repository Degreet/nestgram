import { ApiMethod } from './api-method';

export interface TransferGiftOptions {
  business_connection_id: string;
  owned_gift_id: string;
  new_owner_chat_id: number;
  star_count?: number;
}

/**
 * Transfers an owned unique gift to another user. Requires the can_transfer_and_upgrade_gifts business bot right. Requires can_transfer_stars business bot right if the transfer is paid. Returns True on success.
 * @see https://core.telegram.org/bots/api#transfergift
 */
export class TransferGift extends ApiMethod<TransferGiftOptions, true> {
  readonly method = 'transferGift';

  constructor(payload: TransferGiftOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface TransferGiftOptions {
  business_connection_id: string;
  owned_gift_id: string;
  new_owner_chat_id: number;
  star_count?: number;
}

export class TransferGift extends ApiMethod<TransferGiftOptions, true> {
  readonly method = 'transferGift';

  constructor(payload: TransferGiftOptions) {
    super(payload);
  }
}

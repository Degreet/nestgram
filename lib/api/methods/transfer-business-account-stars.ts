import { ApiMethod } from './api-method';

export interface TransferBusinessAccountStarsOptions {
  business_connection_id: string;
  star_count: number;
}

/**
 * Transfers Telegram Stars from the business account balance to the bot's balance. Requires the can_transfer_stars business bot right. Returns True on success.
 * @see https://core.telegram.org/bots/api#transferbusinessaccountstars
 */
export class TransferBusinessAccountStars extends ApiMethod<
  TransferBusinessAccountStarsOptions,
  true
> {
  readonly method = 'transferBusinessAccountStars';

  constructor(payload: TransferBusinessAccountStarsOptions) {
    super(payload);
  }
}

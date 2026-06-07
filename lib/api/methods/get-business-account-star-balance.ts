import { ApiMethod } from './api-method';
import type { RawStarAmount } from '../../events/raw-update.types';

export interface GetBusinessAccountStarBalanceOptions {
  business_connection_id: string;
}

/**
 * Returns the amount of Telegram Stars owned by a managed business account. Requires the can_view_gifts_and_stars business bot right. Returns StarAmount on success.
 * @see https://core.telegram.org/bots/api#getbusinessaccountstarbalance
 */
export class GetBusinessAccountStarBalance extends ApiMethod<
  GetBusinessAccountStarBalanceOptions,
  RawStarAmount
> {
  readonly method = 'getBusinessAccountStarBalance';

  constructor(payload: GetBusinessAccountStarBalanceOptions) {
    super(payload);
  }
}

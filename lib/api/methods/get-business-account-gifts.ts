import { ApiMethod } from './api-method';
import type { RawOwnedGifts } from '../../events/raw-update.types';

export interface GetBusinessAccountGiftsOptions {
  business_connection_id: string;
  exclude_unsaved?: boolean;
  exclude_saved?: boolean;
  exclude_unlimited?: boolean;
  exclude_limited_upgradable?: boolean;
  exclude_limited_non_upgradable?: boolean;
  exclude_unique?: boolean;
  exclude_from_blockchain?: boolean;
  sort_by_price?: boolean;
  offset?: string;
  limit?: number;
}

/**
 * Returns the gifts received and owned by a managed business account. Requires the can_view_gifts_and_stars business bot right. Returns OwnedGifts on success.
 * @see https://core.telegram.org/bots/api#getbusinessaccountgifts
 */
export class GetBusinessAccountGifts extends ApiMethod<
  GetBusinessAccountGiftsOptions,
  RawOwnedGifts
> {
  readonly method = 'getBusinessAccountGifts';

  constructor(payload: GetBusinessAccountGiftsOptions) {
    super(payload);
  }
}

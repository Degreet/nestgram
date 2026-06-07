import { ApiMethod } from './api-method';
import type { RawOwnedGifts } from '../../events/raw-update.types';

export interface GetUserGiftsOptions {
  user_id: number;
  exclude_unlimited?: boolean;
  exclude_limited_upgradable?: boolean;
  exclude_limited_non_upgradable?: boolean;
  exclude_from_blockchain?: boolean;
  exclude_unique?: boolean;
  sort_by_price?: boolean;
  offset?: string;
  limit?: number;
}

export class GetUserGifts extends ApiMethod<
  GetUserGiftsOptions,
  RawOwnedGifts
> {
  readonly method = 'getUserGifts';

  constructor(payload: GetUserGiftsOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type { RawStarAmount } from '../../events/raw-update.types';

export interface GetBusinessAccountStarBalanceOptions {
  business_connection_id: string;
}

export class GetBusinessAccountStarBalance extends ApiMethod<
  GetBusinessAccountStarBalanceOptions,
  RawStarAmount
> {
  readonly method = 'getBusinessAccountStarBalance';

  constructor(payload: GetBusinessAccountStarBalanceOptions) {
    super(payload);
  }
}

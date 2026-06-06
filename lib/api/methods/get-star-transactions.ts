import { ApiMethod } from './api-method';
import type { RawStarTransactions } from '../../events/raw-update.types';

export interface GetStarTransactionsOptions {
  offset?: number;
  limit?: number;
}

export class GetStarTransactions extends ApiMethod<
  GetStarTransactionsOptions,
  RawStarTransactions
> {
  readonly method = 'getStarTransactions';

  readonly throttled = false;

  constructor(payload?: GetStarTransactionsOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type { RawStarTransactions } from '../../events/raw-update.types';

export interface GetStarTransactionsOptions {
  offset?: number;
  limit?: number;
}

/**
 * Returns the bot's Telegram Star transactions in chronological order. On success, returns a StarTransactions object.
 * @see https://core.telegram.org/bots/api#getstartransactions
 */
export class GetStarTransactions extends ApiMethod<
  GetStarTransactionsOptions,
  RawStarTransactions
> {
  readonly method = 'getStarTransactions';

  constructor(payload?: GetStarTransactionsOptions) {
    super(payload);
  }
}

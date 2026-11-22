import { ApiMethod } from './api-method';
import type { RawUniqueGift } from '../../events/raw-update.types';

export interface GetUniqueGiftOptions {
  name: string;
}

/**
 * Use this method to get information about a unique gift by its name. Returns a UniqueGift object on success.
 * @see https://core.telegram.org/bots/api#getuniquegift
 */
export class GetUniqueGift extends ApiMethod<
  GetUniqueGiftOptions,
  RawUniqueGift
> {
  readonly method = 'getUniqueGift';

  constructor(payload: GetUniqueGiftOptions) {
    super(payload);
  }
}

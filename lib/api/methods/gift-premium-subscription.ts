import { ApiMethod } from './api-method';
import type { RawMessageEntity } from '../../events/raw-update.types';

export interface GiftPremiumSubscriptionOptions {
  user_id: number;
  month_count: number;
  star_count: number;
  text?: string;
  text_parse_mode?: string;
  text_entities?: RawMessageEntity[];
}

/**
 * Gifts a Telegram Premium subscription to the given user. Returns True on success.
 * @see https://core.telegram.org/bots/api#giftpremiumsubscription
 */
export class GiftPremiumSubscription extends ApiMethod<
  GiftPremiumSubscriptionOptions,
  true
> {
  readonly method = 'giftPremiumSubscription';

  constructor(payload: GiftPremiumSubscriptionOptions) {
    super(payload);
  }
}

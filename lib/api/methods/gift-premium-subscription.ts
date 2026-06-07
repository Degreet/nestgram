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

export class GiftPremiumSubscription extends ApiMethod<
  GiftPremiumSubscriptionOptions,
  true
> {
  readonly method = 'giftPremiumSubscription';

  constructor(payload: GiftPremiumSubscriptionOptions) {
    super(payload);
  }
}

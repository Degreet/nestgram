import { ApiMethod } from './api-method';

export interface ConvertGiftToStarsOptions {
  business_connection_id: string;
  owned_gift_id: string;
}

/**
 * Converts a given regular gift to Telegram Stars. Requires the can_convert_gifts_to_stars business bot right. Returns True on success.
 * @see https://core.telegram.org/bots/api#convertgifttostars
 */
export class ConvertGiftToStars extends ApiMethod<
  ConvertGiftToStarsOptions,
  true
> {
  readonly method = 'convertGiftToStars';

  constructor(payload: ConvertGiftToStarsOptions) {
    super(payload);
  }
}

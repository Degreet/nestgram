import { ApiMethod } from './api-method';

export interface DeleteBusinessAccountGiftOptions {
  business_connection_id: string;
  owned_gift_id: string;
}

/**
 * Deletes a regular gift owned by a managed business account without receiving Telegram Stars for it. Requires the can_convert_gifts_to_stars business bot right. The gift can be deleted only if it isn't limited (the field total_count of the Gift is omitted) and wasn't refunded. Returns True on success.
 * @see https://core.telegram.org/bots/api#deletebusinessaccountgift
 */
export class DeleteBusinessAccountGift extends ApiMethod<
  DeleteBusinessAccountGiftOptions,
  true
> {
  readonly method = 'deleteBusinessAccountGift';

  constructor(payload: DeleteBusinessAccountGiftOptions) {
    super(payload);
  }
}

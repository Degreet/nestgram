import { ApiMethod } from './api-method';

export interface EditUserStarSubscriptionOptions {
  user_id: number;
  telegram_payment_charge_id: string;
  is_canceled: boolean;
}

/**
 * Allows the bot to cancel or re-enable extension of a subscription paid in Telegram Stars. Returns True on success.
 * @see https://core.telegram.org/bots/api#edituserstarsubscription
 */
export class EditUserStarSubscription extends ApiMethod<
  EditUserStarSubscriptionOptions,
  true
> {
  readonly method = 'editUserStarSubscription';

  constructor(payload: EditUserStarSubscriptionOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface RefundStarPaymentOptions {
  user_id: number;
  telegram_payment_charge_id: string;
}

/**
 * Refunds a successful payment in Telegram Stars. Returns True on success.
 * @see https://core.telegram.org/bots/api#refundstarpayment
 */
export class RefundStarPayment extends ApiMethod<
  RefundStarPaymentOptions,
  true
> {
  readonly method = 'refundStarPayment';

  constructor(payload: RefundStarPaymentOptions) {
    super(payload);
  }
}

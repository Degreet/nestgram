import { ApiMethod } from './api-method';

export interface RefundStarPaymentOptions {
  user_id: number;
  telegram_payment_charge_id: string;
}

export class RefundStarPayment extends ApiMethod<
  RefundStarPaymentOptions,
  true
> {
  readonly method = 'refundStarPayment';

  constructor(payload: RefundStarPaymentOptions) {
    super(payload);
  }
}

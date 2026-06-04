import { ApiMethod } from './api-method';

export interface EditUserStarSubscriptionOptions {
  user_id: number;
  telegram_payment_charge_id: string;
  is_canceled: boolean;
}

export class EditUserStarSubscription extends ApiMethod<
  EditUserStarSubscriptionOptions,
  true
> {
  readonly method = 'editUserStarSubscription';

  constructor(payload: EditUserStarSubscriptionOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface ConvertGiftToStarsOptions {
  business_connection_id: string;
  owned_gift_id: string;
}

export class ConvertGiftToStars extends ApiMethod<
  ConvertGiftToStarsOptions,
  true
> {
  readonly method = 'convertGiftToStars';

  constructor(payload: ConvertGiftToStarsOptions) {
    super(payload);
  }
}

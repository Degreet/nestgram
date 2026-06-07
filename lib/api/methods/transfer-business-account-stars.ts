import { ApiMethod } from './api-method';

export interface TransferBusinessAccountStarsOptions {
  business_connection_id: string;
  star_count: number;
}

export class TransferBusinessAccountStars extends ApiMethod<
  TransferBusinessAccountStarsOptions,
  true
> {
  readonly method = 'transferBusinessAccountStars';

  constructor(payload: TransferBusinessAccountStarsOptions) {
    super(payload);
  }
}

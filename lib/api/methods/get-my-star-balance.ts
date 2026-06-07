import { ApiMethod } from './api-method';
import type { RawStarAmount } from '../../events/raw-update.types';

export class GetMyStarBalance extends ApiMethod<null, RawStarAmount> {
  readonly method = 'getMyStarBalance';

  constructor() {
    super(null);
  }
}

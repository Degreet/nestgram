import { ApiMethod } from './api-method';
import type { RawGifts } from '../../events/raw-update.types';

export class GetAvailableGifts extends ApiMethod<null, RawGifts> {
  readonly method = 'getAvailableGifts';

  readonly throttled = false;

  constructor() {
    super(null);
  }
}

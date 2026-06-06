import { ApiMethod } from './api-method';

export class Close extends ApiMethod<null, true> {
  readonly method = 'close';

  constructor() {
    super(null);
  }
}

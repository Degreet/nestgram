import { ApiMethod } from './api-method';

export interface SetMyNameOptions {
  name?: string;
  language_code?: string;
}

export class SetMyName extends ApiMethod<SetMyNameOptions, true> {
  readonly method = 'setMyName';

  constructor(payload?: SetMyNameOptions) {
    super(payload);
  }
}

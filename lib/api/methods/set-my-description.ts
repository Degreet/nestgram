import { ApiMethod } from './api-method';

export interface SetMyDescriptionOptions {
  description?: string;
  language_code?: string;
}

export class SetMyDescription extends ApiMethod<SetMyDescriptionOptions, true> {
  readonly method = 'setMyDescription';

  constructor(payload?: SetMyDescriptionOptions) {
    super(payload);
  }
}

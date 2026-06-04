import { ApiMethod } from './api-method';

export interface SetMyShortDescriptionOptions {
  short_description?: string;
  language_code?: string;
}

export class SetMyShortDescription extends ApiMethod<
  SetMyShortDescriptionOptions,
  true
> {
  readonly method = 'setMyShortDescription';

  constructor(payload?: SetMyShortDescriptionOptions) {
    super(payload);
  }
}

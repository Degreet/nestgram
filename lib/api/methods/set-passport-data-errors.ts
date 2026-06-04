import { ApiMethod } from './api-method';
import type { RawPassportElementError } from '../../events/raw-update.types';

export interface SetPassportDataErrorsOptions {
  user_id: number;
  errors: RawPassportElementError[];
}

export class SetPassportDataErrors extends ApiMethod<
  SetPassportDataErrorsOptions,
  true
> {
  readonly method = 'setPassportDataErrors';

  constructor(payload: SetPassportDataErrorsOptions) {
    super(payload);
  }
}

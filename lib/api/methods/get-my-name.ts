import { ApiMethod } from './api-method';
import type { RawBotName } from '../../events/raw-update.types';

export interface GetMyNameOptions {
  language_code?: string;
}

export class GetMyName extends ApiMethod<GetMyNameOptions, RawBotName> {
  readonly method = 'getMyName';

  constructor(payload?: GetMyNameOptions) {
    super(payload);
  }
}

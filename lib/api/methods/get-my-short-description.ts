import { ApiMethod } from './api-method';
import type { RawBotShortDescription } from '../../events/raw-update.types';

export interface GetMyShortDescriptionOptions {
  language_code?: string;
}

export class GetMyShortDescription extends ApiMethod<
  GetMyShortDescriptionOptions,
  RawBotShortDescription
> {
  readonly method = 'getMyShortDescription';

  constructor(payload?: GetMyShortDescriptionOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type { RawBotDescription } from '../../events/raw-update.types';

export interface GetMyDescriptionOptions {
  language_code?: string;
}

export class GetMyDescription extends ApiMethod<
  GetMyDescriptionOptions,
  RawBotDescription
> {
  readonly method = 'getMyDescription';

  constructor(payload?: GetMyDescriptionOptions) {
    super(payload);
  }
}

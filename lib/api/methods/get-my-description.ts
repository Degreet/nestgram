import { ApiMethod } from './api-method';
import type { RawBotDescription } from '../../events/raw-update.types';

export interface GetMyDescriptionOptions {
  language_code?: string;
}

/**
 * Use this method to get the current bot description for the given user language. Returns BotDescription on success.
 * @see https://core.telegram.org/bots/api#getmydescription
 */
export class GetMyDescription extends ApiMethod<
  GetMyDescriptionOptions,
  RawBotDescription
> {
  readonly method = 'getMyDescription';

  constructor(payload?: GetMyDescriptionOptions) {
    super(payload);
  }
}

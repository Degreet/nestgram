import { ApiMethod } from './api-method';
import type { RawBotShortDescription } from '../../events/raw-update.types';

export interface GetMyShortDescriptionOptions {
  language_code?: string;
}

/**
 * Use this method to get the current bot short description for the given user language. Returns BotShortDescription on success.
 * @see https://core.telegram.org/bots/api#getmyshortdescription
 */
export class GetMyShortDescription extends ApiMethod<
  GetMyShortDescriptionOptions,
  RawBotShortDescription
> {
  readonly method = 'getMyShortDescription';

  constructor(payload?: GetMyShortDescriptionOptions) {
    super(payload);
  }
}

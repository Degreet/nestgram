import { ApiMethod } from './api-method';
import type { RawBotName } from '../../events/raw-update.types';

export interface GetMyNameOptions {
  language_code?: string;
}

/**
 * Use this method to get the current bot name for the given user language. Returns BotName on success.
 * @see https://core.telegram.org/bots/api#getmyname
 */
export class GetMyName extends ApiMethod<GetMyNameOptions, RawBotName> {
  readonly method = 'getMyName';

  constructor(payload?: GetMyNameOptions) {
    super(payload);
  }
}

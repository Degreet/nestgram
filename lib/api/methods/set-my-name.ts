import { ApiMethod } from './api-method';

export interface SetMyNameOptions {
  name?: string;
  language_code?: string;
}

/**
 * Use this method to change the bot's name. Returns True on success.
 * @see https://core.telegram.org/bots/api#setmyname
 */
export class SetMyName extends ApiMethod<SetMyNameOptions, true> {
  readonly method = 'setMyName';

  constructor(payload?: SetMyNameOptions) {
    super(payload);
  }
}

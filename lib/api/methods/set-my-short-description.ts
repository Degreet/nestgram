import { ApiMethod } from './api-method';

export interface SetMyShortDescriptionOptions {
  short_description?: string;
  language_code?: string;
}

/**
 * Use this method to change the bot's short description, which is shown on the bot's profile page and is sent together with the link when users share the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#setmyshortdescription
 */
export class SetMyShortDescription extends ApiMethod<
  SetMyShortDescriptionOptions,
  true
> {
  readonly method = 'setMyShortDescription';

  constructor(payload?: SetMyShortDescriptionOptions) {
    super(payload);
  }
}

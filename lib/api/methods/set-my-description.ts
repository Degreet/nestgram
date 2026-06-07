import { ApiMethod } from './api-method';

export interface SetMyDescriptionOptions {
  description?: string;
  language_code?: string;
}

/**
 * Use this method to change the bot's description, which is shown in the chat with the bot if the chat is empty. Returns True on success.
 * @see https://core.telegram.org/bots/api#setmydescription
 */
export class SetMyDescription extends ApiMethod<SetMyDescriptionOptions, true> {
  readonly method = 'setMyDescription';

  constructor(payload?: SetMyDescriptionOptions) {
    super(payload);
  }
}

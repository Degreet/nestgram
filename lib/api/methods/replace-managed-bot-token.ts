import { ApiMethod } from './api-method';

export interface ReplaceManagedBotTokenOptions {
  user_id: number;
}

/**
 * Use this method to revoke the current token of a managed bot and generate a new one. Returns the new token as String on success.
 * @see https://core.telegram.org/bots/api#replacemanagedbottoken
 */
export class ReplaceManagedBotToken extends ApiMethod<
  ReplaceManagedBotTokenOptions,
  string
> {
  readonly method = 'replaceManagedBotToken';

  constructor(payload: ReplaceManagedBotTokenOptions) {
    super(payload);
  }
}

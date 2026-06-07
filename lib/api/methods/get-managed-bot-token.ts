import { ApiMethod } from './api-method';

export interface GetManagedBotTokenOptions {
  user_id: number;
}

/**
 * Use this method to get the token of a managed bot. Returns the token as String on success.
 * @see https://core.telegram.org/bots/api#getmanagedbottoken
 */
export class GetManagedBotToken extends ApiMethod<
  GetManagedBotTokenOptions,
  string
> {
  readonly method = 'getManagedBotToken';

  constructor(payload: GetManagedBotTokenOptions) {
    super(payload);
  }
}

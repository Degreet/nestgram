import { ApiMethod } from './api-method';

export interface GetManagedBotTokenOptions {
  user_id: number;
}

export class GetManagedBotToken extends ApiMethod<
  GetManagedBotTokenOptions,
  string
> {
  readonly method = 'getManagedBotToken';

  constructor(payload: GetManagedBotTokenOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface ReplaceManagedBotTokenOptions {
  user_id: number;
}

export class ReplaceManagedBotToken extends ApiMethod<
  ReplaceManagedBotTokenOptions,
  string
> {
  readonly method = 'replaceManagedBotToken';

  constructor(payload: ReplaceManagedBotTokenOptions) {
    super(payload);
  }
}

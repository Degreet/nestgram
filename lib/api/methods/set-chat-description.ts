import { ApiMethod } from './api-method';

export interface SetChatDescriptionOptions {
  chat_id: number | string;
  description?: string;
}

export class SetChatDescription extends ApiMethod<
  SetChatDescriptionOptions,
  true
> {
  readonly method = 'setChatDescription';

  constructor(payload: SetChatDescriptionOptions) {
    super(payload);
  }
}

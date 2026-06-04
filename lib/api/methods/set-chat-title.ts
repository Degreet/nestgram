import { ApiMethod } from './api-method';

export interface SetChatTitleOptions {
  chat_id: number | string;
  title: string;
}

export class SetChatTitle extends ApiMethod<SetChatTitleOptions, true> {
  readonly method = 'setChatTitle';

  constructor(payload: SetChatTitleOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';

export interface SetChatAdministratorCustomTitleOptions {
  chat_id: number | string;
  user_id: number;
  custom_title: string;
}

export class SetChatAdministratorCustomTitle extends ApiMethod<
  SetChatAdministratorCustomTitleOptions,
  true
> {
  readonly method = 'setChatAdministratorCustomTitle';

  constructor(payload: SetChatAdministratorCustomTitleOptions) {
    super(payload);
  }
}

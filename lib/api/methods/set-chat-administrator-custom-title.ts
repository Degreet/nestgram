import { ApiMethod } from './api-method';

export interface SetChatAdministratorCustomTitleOptions {
  chat_id: number | string;
  user_id: number;
  custom_title: string;
}

/**
 * Use this method to set a custom title for an administrator in a supergroup promoted by the bot. Returns True on success.
 * @see https://core.telegram.org/bots/api#setchatadministratorcustomtitle
 */
export class SetChatAdministratorCustomTitle extends ApiMethod<
  SetChatAdministratorCustomTitleOptions,
  true
> {
  readonly method = 'setChatAdministratorCustomTitle';

  constructor(payload: SetChatAdministratorCustomTitleOptions) {
    super(payload);
  }
}

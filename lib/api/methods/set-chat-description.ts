import { ApiMethod } from './api-method';

export interface SetChatDescriptionOptions {
  chat_id: number | string;
  description?: string;
}

/**
 * Use this method to change the description of a group, a supergroup or a channel. The bot must be an administrator in the chat for this to work and must have the appropriate administrator rights. Returns True on success.
 * @see https://core.telegram.org/bots/api#setchatdescription
 */
export class SetChatDescription extends ApiMethod<
  SetChatDescriptionOptions,
  true
> {
  readonly method = 'setChatDescription';

  constructor(payload: SetChatDescriptionOptions) {
    super(payload);
  }
}

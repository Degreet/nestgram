import { ApiMethod } from './api-method';

export interface SetChatMemberTagOptions {
  chat_id: number | string;
  user_id: number;
  tag?: string;
}

/**
 * Use this method to set a tag for a regular member in a group or a supergroup. The bot must be an administrator in the chat for this to work and must have the can_manage_tags administrator right. Returns True on success.
 * @see https://core.telegram.org/bots/api#setchatmembertag
 */
export class SetChatMemberTag extends ApiMethod<SetChatMemberTagOptions, true> {
  readonly method = 'setChatMemberTag';

  constructor(payload: SetChatMemberTagOptions) {
    super(payload);
  }
}

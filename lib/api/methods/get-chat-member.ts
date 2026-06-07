import { ApiMethod } from './api-method';
import type { RawChatMember } from '../../events/raw-update.types';

export interface GetChatMemberOptions {
  chat_id: number | string;
  user_id: number;
}

/**
 * Use this method to get information about a member of a chat. The method is only guaranteed to work for other users if the bot is an administrator in the chat. Returns a ChatMember object on success.
 * @see https://core.telegram.org/bots/api#getchatmember
 */
export class GetChatMember extends ApiMethod<
  GetChatMemberOptions,
  RawChatMember
> {
  readonly method = 'getChatMember';

  constructor(payload: GetChatMemberOptions) {
    super(payload);
  }
}

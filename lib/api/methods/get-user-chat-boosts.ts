import { ApiMethod } from './api-method';
import type { RawUserChatBoosts } from '../../events/raw-update.types';

export interface GetUserChatBoostsOptions {
  chat_id: number | string;
  user_id: number;
}

/**
 * Use this method to get the list of boosts added to a chat by a user. Requires administrator rights in the chat. Returns a UserChatBoosts object.
 * @see https://core.telegram.org/bots/api#getuserchatboosts
 */
export class GetUserChatBoosts extends ApiMethod<
  GetUserChatBoostsOptions,
  RawUserChatBoosts
> {
  readonly method = 'getUserChatBoosts';

  constructor(payload: GetUserChatBoostsOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type { RawChatPermissions } from '../../events/raw-update.types';

export interface RestrictChatMemberOptions {
  chat_id: number | string;
  user_id: number;
  permissions: RawChatPermissions;
  use_independent_chat_permissions?: boolean;
  until_date?: number;
}

/**
 * Use this method to restrict a user in a supergroup. The bot must be an administrator in the supergroup for this to work and must have the appropriate administrator rights. Pass True for all permissions to lift restrictions from a user. Returns True on success.
 * @see https://core.telegram.org/bots/api#restrictchatmember
 */
export class RestrictChatMember extends ApiMethod<
  RestrictChatMemberOptions,
  true
> {
  readonly method = 'restrictChatMember';

  constructor(payload: RestrictChatMemberOptions) {
    super(payload);
  }
}

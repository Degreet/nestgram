import { ApiMethod } from './api-method';
import type { RawChatPermissions } from '../../events/raw-update.types';

export interface RestrictChatMemberOptions {
  chat_id: number | string;
  user_id: number;
  permissions: RawChatPermissions;
  use_independent_chat_permissions?: boolean;
  until_date?: number;
}

export class RestrictChatMember extends ApiMethod<
  RestrictChatMemberOptions,
  true
> {
  readonly method = 'restrictChatMember';

  constructor(payload: RestrictChatMemberOptions) {
    super(payload);
  }
}

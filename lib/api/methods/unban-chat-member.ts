import { ApiMethod } from './api-method';

export interface UnbanChatMemberOptions {
  chat_id: number | string;
  user_id: number;
  only_if_banned?: boolean;
}

export class UnbanChatMember extends ApiMethod<UnbanChatMemberOptions, true> {
  readonly method = 'unbanChatMember';

  constructor(payload: UnbanChatMemberOptions) {
    super(payload);
  }
}

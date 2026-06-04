import { ApiMethod } from './api-method';

export interface BanChatMemberOptions {
  chat_id: number | string;
  user_id: number;
  until_date?: number;
  revoke_messages?: boolean;
}

export class BanChatMember extends ApiMethod<BanChatMemberOptions, true> {
  readonly method = 'banChatMember';

  constructor(payload: BanChatMemberOptions) {
    super(payload);
  }
}

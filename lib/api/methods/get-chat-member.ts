import { ApiMethod } from './api-method';
import type { RawChatMember } from '../../events/raw-update.types';

export interface GetChatMemberOptions {
  chat_id: number | string;
  user_id: number;
}

export class GetChatMember extends ApiMethod<
  GetChatMemberOptions,
  RawChatMember
> {
  readonly method = 'getChatMember';

  readonly throttled = false;

  constructor(payload: GetChatMemberOptions) {
    super(payload);
  }
}

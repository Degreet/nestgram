import { ApiMethod } from './api-method';
import type { RawChatInviteLink } from '../../events/raw-update.types';

export interface CreateChatInviteLinkOptions {
  chat_id: number | string;
  name?: string;
  expire_date?: number;
  member_limit?: number;
  creates_join_request?: boolean;
}

export class CreateChatInviteLink extends ApiMethod<
  CreateChatInviteLinkOptions,
  RawChatInviteLink
> {
  readonly method = 'createChatInviteLink';

  constructor(payload: CreateChatInviteLinkOptions) {
    super(payload);
  }
}

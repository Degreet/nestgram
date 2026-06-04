import { ApiMethod } from './api-method';
import type { RawChatInviteLink } from '../../events/raw-update.types';

export interface EditChatInviteLinkOptions {
  chat_id: number | string;
  invite_link: string;
  name?: string;
  expire_date?: number;
  member_limit?: number;
  creates_join_request?: boolean;
}

export class EditChatInviteLink extends ApiMethod<
  EditChatInviteLinkOptions,
  RawChatInviteLink
> {
  readonly method = 'editChatInviteLink';

  constructor(payload: EditChatInviteLinkOptions) {
    super(payload);
  }
}

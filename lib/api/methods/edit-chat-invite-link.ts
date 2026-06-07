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

/**
 * Use this method to edit a non-primary invite link created by the bot. The bot must be an administrator in the chat for this to work and must have the appropriate administrator rights. Returns the edited invite link as a ChatInviteLink object.
 * @see https://core.telegram.org/bots/api#editchatinvitelink
 */
export class EditChatInviteLink extends ApiMethod<
  EditChatInviteLinkOptions,
  RawChatInviteLink
> {
  readonly method = 'editChatInviteLink';

  constructor(payload: EditChatInviteLinkOptions) {
    super(payload);
  }
}

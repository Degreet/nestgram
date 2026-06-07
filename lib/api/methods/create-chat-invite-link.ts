import { ApiMethod } from './api-method';
import type { RawChatInviteLink } from '../../events/raw-update.types';

export interface CreateChatInviteLinkOptions {
  chat_id: number | string;
  name?: string;
  expire_date?: number;
  member_limit?: number;
  creates_join_request?: boolean;
}

/**
 * Use this method to create an additional invite link for a chat. The bot must be an administrator in the chat for this to work and must have the appropriate administrator rights. The link can be revoked using the method revokeChatInviteLink. Returns the new invite link as ChatInviteLink object.
 * @see https://core.telegram.org/bots/api#createchatinvitelink
 */
export class CreateChatInviteLink extends ApiMethod<
  CreateChatInviteLinkOptions,
  RawChatInviteLink
> {
  readonly method = 'createChatInviteLink';

  constructor(payload: CreateChatInviteLinkOptions) {
    super(payload);
  }
}

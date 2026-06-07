import { ApiMethod } from './api-method';
import type { RawChatInviteLink } from '../../events/raw-update.types';

export interface RevokeChatInviteLinkOptions {
  chat_id: number | string;
  invite_link: string;
}

/**
 * Use this method to revoke an invite link created by the bot. If the primary link is revoked, a new link is automatically generated. The bot must be an administrator in the chat for this to work and must have the appropriate administrator rights. Returns the revoked invite link as ChatInviteLink object.
 * @see https://core.telegram.org/bots/api#revokechatinvitelink
 */
export class RevokeChatInviteLink extends ApiMethod<
  RevokeChatInviteLinkOptions,
  RawChatInviteLink
> {
  readonly method = 'revokeChatInviteLink';

  constructor(payload: RevokeChatInviteLinkOptions) {
    super(payload);
  }
}

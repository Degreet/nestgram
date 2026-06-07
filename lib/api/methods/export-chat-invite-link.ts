import { ApiMethod } from './api-method';

export interface ExportChatInviteLinkOptions {
  chat_id: number | string;
}

/**
 * Use this method to generate a new primary invite link for a chat; any previously generated primary link is revoked. The bot must be an administrator in the chat for this to work and must have the appropriate administrator rights. Returns the new invite link as String on success.
 * @see https://core.telegram.org/bots/api#exportchatinvitelink
 */
export class ExportChatInviteLink extends ApiMethod<
  ExportChatInviteLinkOptions,
  string
> {
  readonly method = 'exportChatInviteLink';

  constructor(payload: ExportChatInviteLinkOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type { RawChatInviteLink } from '../../events/raw-update.types';

export interface RevokeChatInviteLinkOptions {
  chat_id: number | string;
  invite_link: string;
}

export class RevokeChatInviteLink extends ApiMethod<
  RevokeChatInviteLinkOptions,
  RawChatInviteLink
> {
  readonly method = 'revokeChatInviteLink';

  constructor(payload: RevokeChatInviteLinkOptions) {
    super(payload);
  }
}

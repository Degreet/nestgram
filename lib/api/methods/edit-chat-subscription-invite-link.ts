import { ApiMethod } from './api-method';
import type { RawChatInviteLink } from '../../events/raw-update.types';

export interface EditChatSubscriptionInviteLinkOptions {
  chat_id: number | string;
  invite_link: string;
  name?: string;
}

export class EditChatSubscriptionInviteLink extends ApiMethod<
  EditChatSubscriptionInviteLinkOptions,
  RawChatInviteLink
> {
  readonly method = 'editChatSubscriptionInviteLink';

  constructor(payload: EditChatSubscriptionInviteLinkOptions) {
    super(payload);
  }
}

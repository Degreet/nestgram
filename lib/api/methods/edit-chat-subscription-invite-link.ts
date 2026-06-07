import { ApiMethod } from './api-method';
import type { RawChatInviteLink } from '../../events/raw-update.types';

export interface EditChatSubscriptionInviteLinkOptions {
  chat_id: number | string;
  invite_link: string;
  name?: string;
}

/**
 * Use this method to edit a subscription invite link created by the bot. The bot must have the can_invite_users administrator rights. Returns the edited invite link as a ChatInviteLink object.
 * @see https://core.telegram.org/bots/api#editchatsubscriptioninvitelink
 */
export class EditChatSubscriptionInviteLink extends ApiMethod<
  EditChatSubscriptionInviteLinkOptions,
  RawChatInviteLink
> {
  readonly method = 'editChatSubscriptionInviteLink';

  constructor(payload: EditChatSubscriptionInviteLinkOptions) {
    super(payload);
  }
}

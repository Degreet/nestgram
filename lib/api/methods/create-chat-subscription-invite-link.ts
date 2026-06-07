import { ApiMethod } from './api-method';
import type { RawChatInviteLink } from '../../events/raw-update.types';

export interface CreateChatSubscriptionInviteLinkOptions {
  chat_id: number | string;
  name?: string;
  subscription_period: number;
  subscription_price: number;
}

/**
 * Use this method to create a subscription invite link for a channel chat. The bot must have the can_invite_users administrator rights. The link can be edited using the method editChatSubscriptionInviteLink or revoked using the method revokeChatInviteLink. Returns the new invite link as a ChatInviteLink object.
 * @see https://core.telegram.org/bots/api#createchatsubscriptioninvitelink
 */
export class CreateChatSubscriptionInviteLink extends ApiMethod<
  CreateChatSubscriptionInviteLinkOptions,
  RawChatInviteLink
> {
  readonly method = 'createChatSubscriptionInviteLink';

  constructor(payload: CreateChatSubscriptionInviteLinkOptions) {
    super(payload);
  }
}

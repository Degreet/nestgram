import { ApiMethod } from './api-method';
import type { RawChatInviteLink } from '../../events/raw-update.types';

export interface CreateChatSubscriptionInviteLinkOptions {
  chat_id: number | string;
  name?: string;
  subscription_period: number;
  subscription_price: number;
}

export class CreateChatSubscriptionInviteLink extends ApiMethod<
  CreateChatSubscriptionInviteLinkOptions,
  RawChatInviteLink
> {
  readonly method = 'createChatSubscriptionInviteLink';

  constructor(payload: CreateChatSubscriptionInviteLinkOptions) {
    super(payload);
  }
}

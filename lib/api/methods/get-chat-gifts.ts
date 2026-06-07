import { ApiMethod } from './api-method';
import type { RawOwnedGifts } from '../../events/raw-update.types';

export interface GetChatGiftsOptions {
  chat_id: number | string;
  exclude_unsaved?: boolean;
  exclude_saved?: boolean;
  exclude_unlimited?: boolean;
  exclude_limited_upgradable?: boolean;
  exclude_limited_non_upgradable?: boolean;
  exclude_from_blockchain?: boolean;
  exclude_unique?: boolean;
  sort_by_price?: boolean;
  offset?: string;
  limit?: number;
}

/**
 * Returns the gifts owned by a chat. Returns OwnedGifts on success.
 * @see https://core.telegram.org/bots/api#getchatgifts
 */
export class GetChatGifts extends ApiMethod<
  GetChatGiftsOptions,
  RawOwnedGifts
> {
  readonly method = 'getChatGifts';

  constructor(payload: GetChatGiftsOptions) {
    super(payload);
  }
}

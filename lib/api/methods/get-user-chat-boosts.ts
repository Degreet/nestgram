import { ApiMethod } from './api-method';
import type { RawUserChatBoosts } from '../../events/raw-update.types';

export interface GetUserChatBoostsOptions {
  chat_id: number | string;
  user_id: number;
}

export class GetUserChatBoosts extends ApiMethod<
  GetUserChatBoostsOptions,
  RawUserChatBoosts
> {
  readonly method = 'getUserChatBoosts';

  readonly throttled = false;

  constructor(payload: GetUserChatBoostsOptions) {
    super(payload);
  }
}

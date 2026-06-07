import { ApiMethod } from './api-method';
import type { RawMessage } from '../../events/raw-update.types';

export interface GetUserPersonalChatMessagesOptions {
  user_id: number;
  limit: number;
}

export class GetUserPersonalChatMessages extends ApiMethod<
  GetUserPersonalChatMessagesOptions,
  RawMessage[]
> {
  readonly method = 'getUserPersonalChatMessages';

  constructor(payload: GetUserPersonalChatMessagesOptions) {
    super(payload);
  }
}

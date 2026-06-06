import { ApiMethod } from './api-method';
import type { RawChatFullInfo } from '../../events/raw-update.types';

export interface GetChatOptions {
  chat_id: number | string;
}

export class GetChat extends ApiMethod<GetChatOptions, RawChatFullInfo> {
  readonly method = 'getChat';

  readonly throttled = false;

  constructor(payload: GetChatOptions) {
    super(payload);
  }
}

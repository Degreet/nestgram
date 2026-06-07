import { ApiMethod } from './api-method';
import type { RawChatFullInfo } from '../../events/raw-update.types';

export interface GetChatOptions {
  chat_id: number | string;
}

/**
 * Use this method to get up-to-date information about the chat. Returns a ChatFullInfo object on success.
 * @see https://core.telegram.org/bots/api#getchat
 */
export class GetChat extends ApiMethod<GetChatOptions, RawChatFullInfo> {
  readonly method = 'getChat';

  constructor(payload: GetChatOptions) {
    super(payload);
  }
}

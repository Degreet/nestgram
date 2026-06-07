import { ApiMethod } from './api-method';
import type { RawChatMember } from '../../events/raw-update.types';

export interface GetChatAdministratorsOptions {
  chat_id: number | string;
  return_bots?: boolean;
}

/**
 * Use this method to get a list of administrators in a chat. Returns an Array of ChatMember objects.
 * @see https://core.telegram.org/bots/api#getchatadministrators
 */
export class GetChatAdministrators extends ApiMethod<
  GetChatAdministratorsOptions,
  RawChatMember[]
> {
  readonly method = 'getChatAdministrators';

  constructor(payload: GetChatAdministratorsOptions) {
    super(payload);
  }
}

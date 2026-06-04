import { ApiMethod } from './api-method';
import type { RawChatMember } from '../../events/raw-update.types';

export interface GetChatAdministratorsOptions {
  chat_id: number | string;
}

export class GetChatAdministrators extends ApiMethod<
  GetChatAdministratorsOptions,
  RawChatMember[]
> {
  readonly method = 'getChatAdministrators';

  constructor(payload: GetChatAdministratorsOptions) {
    super(payload);
  }
}

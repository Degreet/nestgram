import { ApiMethod } from './api-method';
import type { RawMenuButton } from '../../events/raw-update.types';

export interface GetChatMenuButtonOptions {
  chat_id?: number;
}

export class GetChatMenuButton extends ApiMethod<
  GetChatMenuButtonOptions,
  RawMenuButton
> {
  readonly method = 'getChatMenuButton';

  readonly throttled = false;

  constructor(payload?: GetChatMenuButtonOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type { RawMenuButton } from '../../events/raw-update.types';

export interface SetChatMenuButtonOptions {
  chat_id?: number;
  menu_button?: RawMenuButton;
}

export class SetChatMenuButton extends ApiMethod<
  SetChatMenuButtonOptions,
  true
> {
  readonly method = 'setChatMenuButton';

  constructor(payload?: SetChatMenuButtonOptions) {
    super(payload);
  }
}

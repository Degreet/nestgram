import { ApiMethod } from './api-method';
import type {
  RawKeyboardButton,
  RawPreparedKeyboardButton,
} from '../../events/raw-update.types';

export interface SavePreparedKeyboardButtonOptions {
  user_id: number;
  button: RawKeyboardButton;
}

/**
 * Stores a keyboard button that can be used by a user within a Mini App. Returns a PreparedKeyboardButton object.
 * @see https://core.telegram.org/bots/api#savepreparedkeyboardbutton
 */
export class SavePreparedKeyboardButton extends ApiMethod<
  SavePreparedKeyboardButtonOptions,
  RawPreparedKeyboardButton
> {
  readonly method = 'savePreparedKeyboardButton';

  constructor(payload: SavePreparedKeyboardButtonOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import type {
  RawKeyboardButton,
  RawPreparedKeyboardButton,
} from '../../events/raw-update.types';

export interface SavePreparedKeyboardButtonOptions {
  user_id: number;
  button: RawKeyboardButton;
}

export class SavePreparedKeyboardButton extends ApiMethod<
  SavePreparedKeyboardButtonOptions,
  RawPreparedKeyboardButton
> {
  readonly method = 'savePreparedKeyboardButton';

  constructor(payload: SavePreparedKeyboardButtonOptions) {
    super(payload);
  }
}

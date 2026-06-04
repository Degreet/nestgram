import { ApiMethod } from './api-method';
import type { RawMessage } from '../../events/raw-update.types';

export interface SetGameScoreOptions {
  user_id: number;
  score: number;
  force?: boolean;
  disable_edit_message?: boolean;
  chat_id?: number;
  message_id?: number;
  inline_message_id?: string;
}

export class SetGameScore extends ApiMethod<
  SetGameScoreOptions,
  RawMessage | boolean
> {
  readonly method = 'setGameScore';

  constructor(payload: SetGameScoreOptions) {
    super(payload);
  }
}

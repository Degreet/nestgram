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

/**
 * Use this method to set the score of the specified user in a game message. On success, if the message is not an inline message, the Message is returned, otherwise True is returned. Returns an error, if the new score is not greater than the user's current score in the chat and force is False.
 * @see https://core.telegram.org/bots/api#setgamescore
 */
export class SetGameScore extends ApiMethod<
  SetGameScoreOptions,
  RawMessage | boolean
> {
  readonly method = 'setGameScore';

  constructor(payload: SetGameScoreOptions) {
    super(payload);
  }
}

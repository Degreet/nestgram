import { ApiMethod } from './api-method';
import type { RawGameHighScore } from '../../events/raw-update.types';

export interface GetGameHighScoresOptions {
  user_id: number;
  chat_id?: number;
  message_id?: number;
  inline_message_id?: string;
}

/**
 * Use this method to get data for high score tables. Will return the score of the specified user and several of their neighbors in a game. Returns an Array of GameHighScore objects.
 * @see https://core.telegram.org/bots/api#getgamehighscores
 */
export class GetGameHighScores extends ApiMethod<
  GetGameHighScoresOptions,
  RawGameHighScore[]
> {
  readonly method = 'getGameHighScores';

  constructor(payload: GetGameHighScoresOptions) {
    super(payload);
  }
}

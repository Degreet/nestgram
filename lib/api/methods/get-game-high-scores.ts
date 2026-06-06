import { ApiMethod } from './api-method';
import type { RawGameHighScore } from '../../events/raw-update.types';

export interface GetGameHighScoresOptions {
  user_id: number;
  chat_id?: number;
  message_id?: number;
  inline_message_id?: string;
}

export class GetGameHighScores extends ApiMethod<
  GetGameHighScoresOptions,
  RawGameHighScore[]
> {
  readonly method = 'getGameHighScores';

  readonly throttled = false;

  constructor(payload: GetGameHighScoresOptions) {
    super(payload);
  }
}

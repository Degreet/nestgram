import { ApiMethod } from './api-method';
import type {
  RawInlineKeyboardMarkup,
  RawPoll,
} from '../../events/raw-update.types';

export interface StopPollOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_id: number;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

/**
 * Use this method to stop a poll which was sent by the bot. On success, the stopped Poll is returned.
 * @see https://core.telegram.org/bots/api#stoppoll
 */
export class StopPoll extends ApiMethod<StopPollOptions, RawPoll> {
  readonly method = 'stopPoll';

  constructor(payload: StopPollOptions) {
    super(payload);
  }
}

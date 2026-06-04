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

export class StopPoll extends ApiMethod<StopPollOptions, RawPoll> {
  readonly method = 'stopPoll';

  constructor(payload: StopPollOptions) {
    super(payload);
  }
}

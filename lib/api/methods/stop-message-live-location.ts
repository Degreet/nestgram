import { ApiMethod } from './api-method';
import type {
  RawInlineKeyboardMarkup,
  RawMessage,
} from '../../events/raw-update.types';

export interface StopMessageLiveLocationOptions {
  business_connection_id?: string;
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

/**
 * Use this method to stop updating a live location message before live_period expires. On success, if the message is not an inline message, the edited Message is returned, otherwise True is returned.
 * @see https://core.telegram.org/bots/api#stopmessagelivelocation
 */
export class StopMessageLiveLocation extends ApiMethod<
  StopMessageLiveLocationOptions,
  RawMessage | boolean
> {
  readonly method = 'stopMessageLiveLocation';

  constructor(payload?: StopMessageLiveLocationOptions) {
    super(payload);
  }
}

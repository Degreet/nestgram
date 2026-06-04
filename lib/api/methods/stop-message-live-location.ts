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

export class StopMessageLiveLocation extends ApiMethod<
  StopMessageLiveLocationOptions,
  RawMessage | boolean
> {
  readonly method = 'stopMessageLiveLocation';

  constructor(payload?: StopMessageLiveLocationOptions) {
    super(payload);
  }
}

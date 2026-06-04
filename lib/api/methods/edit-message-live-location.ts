import { ApiMethod } from './api-method';
import type {
  RawInlineKeyboardMarkup,
  RawMessage,
} from '../../events/raw-update.types';

export interface EditMessageLiveLocationOptions {
  business_connection_id?: string;
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  latitude: number;
  longitude: number;
  live_period?: number;
  horizontal_accuracy?: number;
  heading?: number;
  proximity_alert_radius?: number;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

export class EditMessageLiveLocation extends ApiMethod<
  EditMessageLiveLocationOptions,
  RawMessage | boolean
> {
  readonly method = 'editMessageLiveLocation';

  constructor(payload: EditMessageLiveLocationOptions) {
    super(payload);
  }
}

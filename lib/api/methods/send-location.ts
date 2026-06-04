import { ApiMethod } from './api-method';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawMessage,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface SendLocationOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  message_effect_id?: string;
  reply_parameters?: RawReplyParameters;
  reply_markup?:
    | RawInlineKeyboardMarkup
    | RawReplyKeyboardMarkup
    | RawReplyKeyboardRemove
    | RawForceReply
    | { toJSON(): unknown };
}

export class SendLocation extends ApiMethod<SendLocationOptions, RawMessage> {
  readonly method = 'sendLocation';

  constructor(payload: SendLocationOptions) {
    super(payload);
  }
}

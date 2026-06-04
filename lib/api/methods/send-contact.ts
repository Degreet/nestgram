import { ApiMethod } from './api-method';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawMessage,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface SendContactOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  phone_number: string;
  first_name: string;
  last_name?: string;
  vcard?: string;
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

export class SendContact extends ApiMethod<SendContactOptions, RawMessage> {
  readonly method = 'sendContact';

  constructor(payload: SendContactOptions) {
    super(payload);
  }
}

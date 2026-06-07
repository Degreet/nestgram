import { ApiMethod } from './api-method';
import type {
  RawInlineKeyboardMarkup,
  RawLabeledPrice,
  RawMessage,
  RawReplyParameters,
  RawSuggestedPostParameters,
} from '../../events/raw-update.types';

export interface SendInvoiceOptions {
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  title: string;
  description: string;
  payload: string;
  provider_token?: string;
  currency: string;
  prices: RawLabeledPrice[];
  max_tip_amount?: number;
  suggested_tip_amounts?: number[];
  start_parameter?: string;
  provider_data?: string;
  photo_url?: string;
  photo_size?: number;
  photo_width?: number;
  photo_height?: number;
  need_name?: boolean;
  need_phone_number?: boolean;
  need_email?: boolean;
  need_shipping_address?: boolean;
  send_phone_number_to_provider?: boolean;
  send_email_to_provider?: boolean;
  is_flexible?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  message_effect_id?: string;
  suggested_post_parameters?: RawSuggestedPostParameters;
  reply_parameters?: RawReplyParameters;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

export class SendInvoice extends ApiMethod<SendInvoiceOptions, RawMessage> {
  readonly method = 'sendInvoice';

  constructor(payload: SendInvoiceOptions) {
    super(payload);
  }
}

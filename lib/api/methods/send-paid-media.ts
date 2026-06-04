import { ApiMethod } from './api-method';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawInputPaidMedia,
  RawMessage,
  RawMessageEntity,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface SendPaidMediaOptions {
  business_connection_id?: string;
  chat_id: number | string;
  star_count: number;
  media: RawInputPaidMedia[];
  payload?: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  reply_parameters?: RawReplyParameters;
  reply_markup?:
    | RawInlineKeyboardMarkup
    | RawReplyKeyboardMarkup
    | RawReplyKeyboardRemove
    | RawForceReply
    | { toJSON(): unknown };
}

export class SendPaidMedia extends ApiMethod<SendPaidMediaOptions, RawMessage> {
  readonly method = 'sendPaidMedia';

  constructor(payload: SendPaidMediaOptions) {
    super(payload);
  }
}

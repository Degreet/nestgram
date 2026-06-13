import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawInputPaidMedia,
  RawMessage,
  RawMessageEntity,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
  RawSuggestedPostParameters,
} from '../../events/raw-update.types';
import type { ParseModeValue } from '../parse-mode';

export interface SendPaidMediaOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  star_count: number;
  media: RawInputPaidMedia[];
  payload?: string;
  caption?: string;
  parse_mode?: ParseModeValue;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  suggested_post_parameters?: RawSuggestedPostParameters;
  reply_parameters?: RawReplyParameters;
  reply_markup?:
    | RawInlineKeyboardMarkup
    | RawReplyKeyboardMarkup
    | RawReplyKeyboardRemove
    | RawForceReply
    | { toJSON(): unknown };
}

/**
 * Use this method to send paid media. On success, the sent Message is returned.
 * @see https://core.telegram.org/bots/api#sendpaidmedia
 */
export class SendPaidMedia extends ApiMethod<SendPaidMediaOptions, RawMessage> {
  readonly method = 'sendPaidMedia';

  readonly isAttachMedia = true;

  constructor(payload: SendPaidMediaOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

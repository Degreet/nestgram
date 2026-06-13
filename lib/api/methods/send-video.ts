import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { InputFile } from '../input-file';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawMessage,
  RawMessageEntity,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
  RawSuggestedPostParameters,
} from '../../events/raw-update.types';
import type { ParseModeValue } from '../parse-mode';

export interface SendVideoOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  video: InputFile | string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: InputFile | string;
  cover?: InputFile | string;
  start_timestamp?: number;
  caption?: string;
  parse_mode?: ParseModeValue;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  has_spoiler?: boolean;
  supports_streaming?: boolean;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  message_effect_id?: string;
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
 * Use this method to send video files, Telegram clients support MPEG4 videos (other formats may be sent as Document). On success, the sent Message is returned. Bots can currently send video files of up to 50 MB in size, this limit may be changed in the future.
 * @see https://core.telegram.org/bots/api#sendvideo
 */
export class SendVideo extends ApiMethod<SendVideoOptions, RawMessage> {
  readonly method = 'sendVideo';

  constructor(payload: SendVideoOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

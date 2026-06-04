import { ApiMethod } from './api-method';
import { InputFile } from '../input-file';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawMessage,
  RawMessageEntity,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface SendVideoOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  video: InputFile | string;
  duration?: number;
  width?: number;
  height?: number;
  thumbnail?: InputFile | string;
  cover?: InputFile | string;
  start_timestamp?: number;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  has_spoiler?: boolean;
  supports_streaming?: boolean;
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

export class SendVideo extends ApiMethod<SendVideoOptions, RawMessage> {
  readonly method = 'sendVideo';

  constructor(payload: SendVideoOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return (
      this.payload?.video instanceof InputFile ||
      this.payload?.thumbnail instanceof InputFile ||
      this.payload?.cover instanceof InputFile
    );
  }
}

import { ApiMethod } from './api-method';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawMessageEntity,
  RawMessageId,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface CopyMessageOptions {
  chat_id: number | string;
  message_thread_id?: number;
  from_chat_id: number | string;
  message_id: number;
  video_start_timestamp?: number;
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

export class CopyMessage extends ApiMethod<CopyMessageOptions, RawMessageId> {
  readonly method = 'copyMessage';

  constructor(payload: CopyMessageOptions) {
    super(payload);
  }
}

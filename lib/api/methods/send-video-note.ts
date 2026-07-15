import { ApiMethod } from './api-method';
import { hasInputFile } from '../form-data';
import type { InputFile } from '../input-file';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawMessage,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
  RawSuggestedPostParameters,
} from '../../events/raw-update.types';

export interface SendVideoNoteOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  receiver_user_id?: number;
  callback_query_id?: string;
  video_note: InputFile | string;
  duration?: number;
  length?: number;
  thumbnail?: InputFile | string;
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
 * As of v.4.0, Telegram clients support rounded square MPEG4 videos of up to 1 minute long. Use this method to send video messages. On success, the sent Message is returned.
 * @see https://core.telegram.org/bots/api#sendvideonote
 */
export class SendVideoNote extends ApiMethod<SendVideoNoteOptions, RawMessage> {
  readonly method = 'sendVideoNote';

  constructor(payload: SendVideoNoteOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

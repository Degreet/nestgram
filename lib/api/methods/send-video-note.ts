import { ApiMethod } from './api-method';
import { InputFile } from '../input-file';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawMessage,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface SendVideoNoteOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  video_note: InputFile | string;
  duration?: number;
  length?: number;
  thumbnail?: InputFile | string;
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

export class SendVideoNote extends ApiMethod<SendVideoNoteOptions, RawMessage> {
  readonly method = 'sendVideoNote';

  constructor(payload: SendVideoNoteOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return (
      this.payload?.video_note instanceof InputFile ||
      this.payload?.thumbnail instanceof InputFile
    );
  }
}

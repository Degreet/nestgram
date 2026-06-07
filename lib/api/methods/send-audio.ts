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
  RawSuggestedPostParameters,
} from '../../events/raw-update.types';

export interface SendAudioOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  audio: InputFile | string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  duration?: number;
  performer?: string;
  title?: string;
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

export class SendAudio extends ApiMethod<SendAudioOptions, RawMessage> {
  readonly method = 'sendAudio';

  constructor(payload: SendAudioOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return (
      this.payload?.audio instanceof InputFile ||
      this.payload?.thumbnail instanceof InputFile
    );
  }
}

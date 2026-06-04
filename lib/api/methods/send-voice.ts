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

export interface SendVoiceOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  voice: InputFile | string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  duration?: number;
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

export class SendVoice extends ApiMethod<SendVoiceOptions, RawMessage> {
  readonly method = 'sendVoice';

  constructor(payload: SendVoiceOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return this.payload?.voice instanceof InputFile;
  }
}

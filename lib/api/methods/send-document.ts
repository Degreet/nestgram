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

export interface SendDocumentOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  document: InputFile | string;
  thumbnail?: InputFile | string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  disable_content_type_detection?: boolean;
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

export class SendDocument extends ApiMethod<SendDocumentOptions, RawMessage> {
  readonly method = 'sendDocument';

  constructor(payload: SendDocumentOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return (
      this.payload?.document instanceof InputFile ||
      this.payload?.thumbnail instanceof InputFile
    );
  }
}

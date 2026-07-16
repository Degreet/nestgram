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

export interface SendDocumentOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  receiver_user_id?: number;
  callback_query_id?: string;
  document: InputFile | string;
  thumbnail?: InputFile | string;
  caption?: string;
  parse_mode?: ParseModeValue;
  caption_entities?: RawMessageEntity[];
  disable_content_type_detection?: boolean;
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
 * Use this method to send general files. On success, the sent Message is returned. Bots can currently send files of any type of up to 50 MB in size, this limit may be changed in the future.
 * @see https://core.telegram.org/bots/api#senddocument
 */
export class SendDocument extends ApiMethod<SendDocumentOptions, RawMessage> {
  readonly method = 'sendDocument';

  constructor(payload: SendDocumentOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }
}

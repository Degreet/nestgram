import { ApiMethod } from './api-method';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawInputPollOption,
  RawMessage,
  RawMessageEntity,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface SendPollOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  question: string;
  question_parse_mode?: string;
  question_entities?: RawMessageEntity[];
  options: RawInputPollOption[];
  is_anonymous?: boolean;
  type?: 'quiz' | 'regular';
  allows_multiple_answers?: boolean;
  correct_option_id?: number;
  explanation?: string;
  explanation_parse_mode?: string;
  explanation_entities?: RawMessageEntity[];
  open_period?: number;
  close_date?: number;
  is_closed?: boolean;
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

export class SendPoll extends ApiMethod<SendPollOptions, RawMessage> {
  readonly method = 'sendPoll';

  constructor(payload: SendPollOptions) {
    super(payload);
  }
}

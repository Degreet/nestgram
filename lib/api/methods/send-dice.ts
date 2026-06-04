import { ApiMethod } from './api-method';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawMessage,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface SendDiceOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  emoji?: '🎲' | '🎯' | '🏀' | '⚽' | '🎳' | '🎰';
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

export class SendDice extends ApiMethod<SendDiceOptions, RawMessage> {
  readonly method = 'sendDice';

  constructor(payload: SendDiceOptions) {
    super(payload);
  }
}

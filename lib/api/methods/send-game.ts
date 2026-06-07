import { ApiMethod } from './api-method';
import type {
  RawInlineKeyboardMarkup,
  RawMessage,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface SendGameOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  game_short_name: string;
  disable_notification?: boolean;
  protect_content?: boolean;
  allow_paid_broadcast?: boolean;
  message_effect_id?: string;
  reply_parameters?: RawReplyParameters;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

export class SendGame extends ApiMethod<SendGameOptions, RawMessage> {
  readonly method = 'sendGame';

  constructor(payload: SendGameOptions) {
    super(payload);
  }
}

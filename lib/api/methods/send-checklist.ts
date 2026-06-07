import { ApiMethod } from './api-method';
import type {
  RawInlineKeyboardMarkup,
  RawInputChecklist,
  RawMessage,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface SendChecklistOptions {
  business_connection_id: string;
  chat_id: number | string;
  checklist: RawInputChecklist;
  disable_notification?: boolean;
  protect_content?: boolean;
  message_effect_id?: string;
  reply_parameters?: RawReplyParameters;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

/**
 * Use this method to send a checklist on behalf of a connected business account. On success, the sent Message is returned.
 * @see https://core.telegram.org/bots/api#sendchecklist
 */
export class SendChecklist extends ApiMethod<SendChecklistOptions, RawMessage> {
  readonly method = 'sendChecklist';

  constructor(payload: SendChecklistOptions) {
    super(payload);
  }
}

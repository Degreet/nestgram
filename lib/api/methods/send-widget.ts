import { ApiMethod } from './api-method';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawMessage,
  RawMessageEntity,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
} from '../../events/raw-update.types';
import type { ParseModeValue } from '../parse-mode';

export interface SendWidgetOptions {
  chat_id: number | string;
  message_thread_id?: number;
  html: string;
  width?: number;
  height?: number;
  public_data?: string;
  chat_data?: string;
  caption?: string;
  parse_mode?: ParseModeValue;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  allow_queries?: boolean;
  is_shared?: boolean;
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

/**
 * Use this method to send a message with an HTML widget. Currently, in the production environment, widgets can be sent only to private chats, and sent widgets automatically have protected content and therefore can't be forwarded. On success, the sent Message is returned.
 * @see https://core.telegram.org/bots/api#sendwidget
 */
export class SendWidget extends ApiMethod<SendWidgetOptions, RawMessage> {
  readonly method = 'sendWidget';

  constructor(payload: SendWidgetOptions) {
    super(payload);
  }
}

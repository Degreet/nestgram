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

export interface SendSharedWidgetOptions {
  chat_id: number | string;
  message_thread_id?: number;
  widget_id: string;
  chat_data?: string;
  caption?: string;
  parse_mode?: ParseModeValue;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
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
 * Use this method to send again a shared widget created by the bot. Currently, in the production environment, widgets can be sent only to private chats, and sent widgets automatically have protected content and therefore can't be forwarded. On success, the sent Message is returned.
 * @see https://core.telegram.org/bots/api#sendsharedwidget
 */
export class SendSharedWidget extends ApiMethod<
  SendSharedWidgetOptions,
  RawMessage
> {
  readonly method = 'sendSharedWidget';

  constructor(payload: SendSharedWidgetOptions) {
    super(payload);
  }
}

import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawLinkPreviewOptions,
  RawMessage,
  RawMessageEntity,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
  RawSuggestedPostParameters,
} from '../../events/raw-update.types';
import type { ParseModeValue } from '../parse-mode';

export interface SendMessageOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  receiver_user_id?: number;
  callback_query_id?: string;
  text: string;
  parse_mode?: ParseModeValue;
  entities?: RawMessageEntity[];
  link_preview_options?: RawLinkPreviewOptions;
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
 * Use this method to send text messages. On success, the sent Message is returned.
 * @see https://core.telegram.org/bots/api#sendmessage
 */
export class SendMessage extends ApiMethod<SendMessageOptions, Message> {
  readonly method = 'sendMessage';

  constructor(payload: SendMessageOptions) {
    super(payload);
  }

  wrap(raw: unknown, bot: BotService): Message {
    return new Message(bot, raw as Partial<RawMessage>);
  }
}

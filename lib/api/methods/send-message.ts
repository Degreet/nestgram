import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawLinkPreviewOptions,
  RawMessageEntity,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
} from '../../events/raw-update.types';

export interface SendMessageOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  text: string;
  parse_mode?: string;
  entities?: RawMessageEntity[];
  link_preview_options?: RawLinkPreviewOptions;
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

export class SendMessage extends ApiMethod<SendMessageOptions, Message> {
  readonly method = 'sendMessage';

  constructor(payload: SendMessageOptions) {
    super(payload);
  }

  wrap(raw: unknown, bot: BotService): Message {
    return new Message(bot, raw as Partial<Message>);
  }
}

import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';
import { hasInputFile } from '../form-data';
import type {
  RawForceReply,
  RawInlineKeyboardMarkup,
  RawInputRichMessage,
  RawMessage,
  RawReplyKeyboardMarkup,
  RawReplyKeyboardRemove,
  RawReplyParameters,
  RawSuggestedPostParameters,
} from '../../events/raw-update.types';

export interface SendRichMessageOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  direct_messages_topic_id?: number;
  rich_message: RawInputRichMessage;
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
 * Use this method to send rich messages. If the message contains a block with a media element, then the bot must have the right to send the media to the chat. On success, the sent Message is returned.
 * @see https://core.telegram.org/bots/api#sendrichmessage
 */
export class SendRichMessage extends ApiMethod<
  SendRichMessageOptions,
  Message
> {
  readonly method = 'sendRichMessage';

  readonly isAttachMedia = true;

  constructor(payload: SendRichMessageOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }

  wrap(raw: unknown, bot: BotService): Message {
    return new Message(bot, raw as Partial<RawMessage>);
  }
}

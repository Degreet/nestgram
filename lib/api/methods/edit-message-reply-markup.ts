import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';
import type { RawInlineKeyboardMarkup } from '../../events/raw-update.types';

export interface EditMessageReplyMarkupOptions {
  business_connection_id?: string;
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

export class EditMessageReplyMarkup extends ApiMethod<
  EditMessageReplyMarkupOptions,
  Message | true
> {
  readonly method = 'editMessageReplyMarkup';

  constructor(payload?: EditMessageReplyMarkupOptions) {
    super(payload);
  }

  wrap(raw: unknown, bot: BotService): Message | true {
    return typeof raw === 'object' && raw !== null
      ? new Message(bot, raw as Partial<Message>)
      : true;
  }
}

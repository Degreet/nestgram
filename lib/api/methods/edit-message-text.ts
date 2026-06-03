import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';

export interface EditMessageTextOptions {
  business_connection_id?: string;
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  text: string;
  parse_mode?: string;
  entities?: any[];
  link_preview_options?: any;
  reply_markup?: any;
}

/** Edits a message's text. Returns the edited `Message`, or `true` for inline. */
export class EditMessageText extends ApiMethod<
  EditMessageTextOptions,
  Message | true
> {
  readonly method = 'editMessageText';

  constructor(payload: EditMessageTextOptions) {
    super(payload);
  }

  wrap(raw: unknown, bot: BotService): Message | true {
    return typeof raw === 'object' && raw !== null
      ? new Message(bot, raw as Partial<Message>)
      : true;
  }
}

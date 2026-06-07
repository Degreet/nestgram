import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';
import type {
  RawInlineKeyboardMarkup,
  RawLinkPreviewOptions,
  RawMessageEntity,
} from '../../events/raw-update.types';

export interface EditMessageTextOptions {
  business_connection_id?: string;
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  text: string;
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  entities?: RawMessageEntity[];
  link_preview_options?: RawLinkPreviewOptions;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

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

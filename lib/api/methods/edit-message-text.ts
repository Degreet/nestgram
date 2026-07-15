import { ApiMethod } from './api-method';
import { Message } from '../../events';
import type { BotService } from '../bot.service';
import { hasInputFile } from '../form-data';
import type {
  RawInlineKeyboardMarkup,
  RawInputRichMessage,
  RawLinkPreviewOptions,
  RawMessage,
  RawMessageEntity,
} from '../../events/raw-update.types';
import type { ParseModeValue } from '../parse-mode';

export interface EditMessageTextOptions {
  business_connection_id?: string;
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  text?: string;
  parse_mode?: ParseModeValue;
  entities?: RawMessageEntity[];
  link_preview_options?: RawLinkPreviewOptions;
  rich_message?: RawInputRichMessage;
  reply_markup?: RawInlineKeyboardMarkup | { toJSON(): unknown };
}

/**
 * Use this method to edit text, rich and game messages. On success, if the edited message is not an inline message, the edited Message is returned, otherwise True is returned. Note that business messages that were not sent by the bot and do not contain an inline keyboard can only be edited within 48 hours from the time they were sent.
 * @see https://core.telegram.org/bots/api#editmessagetext
 */
export class EditMessageText extends ApiMethod<
  EditMessageTextOptions,
  Message | true
> {
  readonly method = 'editMessageText';

  readonly isAttachMedia = true;

  constructor(payload?: EditMessageTextOptions) {
    super(payload);
  }

  get hasMedia(): boolean {
    return hasInputFile(this.payload);
  }

  wrap(raw: unknown, bot: BotService): Message | true {
    return typeof raw === 'object' && raw !== null
      ? new Message(bot, raw as Partial<RawMessage>)
      : true;
  }
}

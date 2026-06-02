import { ApiMethod } from './api-method';
import { Message } from '../../events';
import { BotService } from '../bot.service';

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
  protected readonly methodName = 'editMessageText';

  constructor(
    readonly botService: BotService,
    options: EditMessageTextOptions,
  ) {
    super(botService.token, options);
  }

  interceptor(result: Message | true) {
    return typeof result === 'object'
      ? new Message(this.botService, result)
      : result;
  }
}

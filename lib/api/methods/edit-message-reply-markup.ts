import { ApiMethod } from './api-method';
import { Message } from '../../events';
import { BotService } from '../bot.service';

export interface EditMessageReplyMarkupOptions {
  business_connection_id?: string;
  chat_id?: number | string;
  message_id?: number;
  inline_message_id?: string;
  reply_markup?: any;
}

/** Edits only a message's inline keyboard. Returns the `Message`, or `true`. */
export class EditMessageReplyMarkup extends ApiMethod<
  EditMessageReplyMarkupOptions,
  Message | true
> {
  protected readonly methodName = 'editMessageReplyMarkup';

  constructor(
    readonly botService: BotService,
    options: EditMessageReplyMarkupOptions,
  ) {
    super(botService.token, options);
  }

  interceptor(result: Message | true) {
    return typeof result === 'object'
      ? new Message(this.botService, result)
      : result;
  }
}

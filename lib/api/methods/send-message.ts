import { ApiMethod } from './api-method';
import { Message } from '../../events';
import { BotService } from '../bot.service';

export interface SendMessageOptions {
  business_connection_id?: string;
  chat_id: number | string;
  message_thread_id?: number;
  text: string;
  parse_mode?: string;
  entities?: any[];
  link_preview_options?: any;
  disable_notification?: boolean;
  protect_content?: boolean;
  message_effect_id?: string;
  reply_parameters?: any;
  reply_markup?: any;
}

export class SendMessage extends ApiMethod<SendMessageOptions, Message> {
  protected readonly methodName = 'sendMessage';

  constructor(readonly botService: BotService, options: SendMessageOptions) {
    super(botService.token, options);
  }

  interceptor(object: Message) {
    return new Message(this.botService, object);
  }
}

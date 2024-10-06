import { ApiMethod } from './ApiMethod';
import { Message } from '../types';
import { BotService } from '../bot';

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
  protected readonly isFormData = false;

  constructor(
    public readonly botService: BotService,
    public options: SendMessageOptions,
  ) {
    super(botService.token, options);
  }

  interceptor(object: Message): Message {
    return Message.fromObject(this.botService, object);
  }
}

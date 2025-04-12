import { TelegramObject } from './TelegramObject';
import { BotService } from '../bot';
import { SendMessageOptions } from '../methods';
import { UpdateType } from '../decorators';

@UpdateType(
  'message',
  'edited_message',
  'channel_post',
  'edited_channel_post',
  'business_message',
  'edited_business_message',
)
export class Message extends TelegramObject {
  message_id: number;
  message_thread_id?: number;
  from: any;
  chat: any;
  text?: string;
  reply_markup?: any;

  constructor(private readonly botService: BotService, from: Partial<Message>) {
    super();
    Object.assign(this, from);
  }

  answer(text: string, options?: Partial<SendMessageOptions>) {
    return this.botService.sendMessage(this.chat.id, text, options);
  }

  reply(text: string, options?: Partial<SendMessageOptions>) {
    return this.botService.sendMessage(this.chat.id, text, {
      reply_parameters: { message_id: this.message_id },
      ...options,
    });
  }
}

import { BotService } from '../bot';
import { UpdateObject } from '../types';

export class Message extends UpdateObject {
  updateTitle = 'message';

  message_id: number;
  message_thread_id?: number;
  from: any;
  chat: any;
  text?: string;
  reply_markup?: any;

  protected get chatId() {
    return this.chat.id;
  }

  protected get messageId() {
    return this.message_id;
  }

  static fromObject(botService: BotService, object: Partial<Message>) {
    const message = new Message(botService);
    for (const key in object) message[key] = object[key];
    return message;
  }
}

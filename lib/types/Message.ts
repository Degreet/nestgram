import { ShortcutMethods } from '../methods/ShortcutMethods';
import { BotService } from '../bot';

export class Message extends ShortcutMethods {
  message_id: number;
  message_thread_id?: number;
  from: any;
  chat: any;
  text?: string;
  reply_markup?: any;

  protected get chatIdShortcut() {
    return this.chat.id;
  }

  static fromObject(botService: BotService, object: Partial<Message>) {
    const message = new Message(botService);

    for (const key in object) {
      message[key] = object[key];
    }

    return message;
  }
}

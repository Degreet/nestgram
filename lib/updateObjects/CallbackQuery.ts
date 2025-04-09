import { BotService } from '../bot';
import { UpdateObject } from '../types';
import { Message } from './Message';

export class CallbackQuery extends UpdateObject {
  updateTitle = 'callback_query';

  id: string;
  from: any;
  message?: Message;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;

  protected get chatId() {
    return this.from.id;
  }

  protected get messageId() {
    return this.message?.message_id;
  }

  static fromObject(botService: BotService, object: Partial<CallbackQuery>) {
    const callbackQuery = new CallbackQuery(botService);
    for (const key in object) callbackQuery[key] = object[key];
    return callbackQuery;
  }
}

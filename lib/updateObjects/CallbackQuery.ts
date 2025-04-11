import { UpdateObject } from '../types';
import { Message } from './Message';

export class CallbackQuery extends UpdateObject {
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
}

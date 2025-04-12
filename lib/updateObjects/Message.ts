import { UpdateObject } from './UpdateObject';

export class Message extends UpdateObject {
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
}

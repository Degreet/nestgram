export interface Message {
  message_id: number;
  message_thread_id?: number;
  from: any;
  text?: string;
  reply_markup?: any;
}

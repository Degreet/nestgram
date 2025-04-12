import { Message, CallbackQuery } from '../telegramObjects';

export interface Update {
  _updateType: string;
  _telegramObject?: any;

  update_id: number;
  message?: Message;
  edited_message?: Message;
  channel_post?: Message;
  edited_channel_post?: Message;
  business_message?: Message;
  edited_business_message?: Message;
  callback_query?: CallbackQuery;
}

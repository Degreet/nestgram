import { Message } from './Message';

export interface Update {
  update_id: number;
  message?: Message;
}

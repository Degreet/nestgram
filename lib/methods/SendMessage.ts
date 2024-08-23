import { ApiMethod } from './ApiMethod';
import { Message } from '../types';

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

  constructor(token: string, options: SendMessageOptions) {
    super(token, options);
  }
}

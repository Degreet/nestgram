import { IMessageEntity } from './update.types';

export type IOptions = ISendOptions | ISendPhotoOptions;

export interface ISendFetchOptions extends ISendOptions {
  chat_id: number | string;
  text: string;
}

export interface ISendOptions {
  parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
  entities?: IMessageEntity[];
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  reply_markup?: any;
}

export interface ISendPhotoFetchOptions extends ISendPhotoOptions {
  chat_id: number | string;
  photo?: string | any; // configures in form data
}

export interface ISendPhotoOptions extends ISendOptions {
  caption?: string;
  caption_entities?: IMessageEntity[];
}

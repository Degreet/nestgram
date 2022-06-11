import { IMessageEntity } from './update.types';
import { ReplyMarkup } from './keyboard.types';
import { Thumb } from '../classes';

export type IOptions = ISendOptions | ISendPhotoOptions | ISendVideoOptions;
export type ParseModes = 'HTML' | 'Markdown' | 'MarkdownV2';

export interface ISendFetchOptions extends ISendOptions {
  chat_id: number | string;
  text: string;
}

export interface ISendOptions {
  parse_mode?: ParseModes;
  entities?: IMessageEntity[];
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  reply_markup?: ReplyMarkup;
}

export interface ISendPhotoFetchOptions extends ISendPhotoOptions {
  chat_id: number | string;
  photo?: string | any; // configures in form data
}

export interface ISendPhotoOptions extends ISendOptions, IDefaultSendMediaConfig {
  caption?: string;
  caption_entities?: IMessageEntity[];
}

export interface ISendVideoOptions extends ISendPhotoOptions {
  supports_streaming?: boolean;
  duration?: number;
  width?: number;
  height?: number;
}

export interface ISendDocumentOptions extends ISendPhotoOptions {}

export interface ISendDocumentFetchOptions extends ISendDocumentOptions {
  chat_id: number | string;
  document?: string | any; // configures in form data
}

export interface ISendAudioOptions extends ISendPhotoOptions {
  duration?: number;
  performer?: string;
  title?: string;
}

export interface ISendVideoFetchOptions extends ISendVideoOptions {
  chat_id: number | string;
  video?: string | any; // configures in form data
}

export interface ISendAudioFetchOptions extends ISendAudioOptions {
  chat_id: number | string;
  audio?: string | any; // configures in form data
}

export interface IAnswerCallbackQueryOptions {
  text?: string;
  show_alert?: boolean;
  url?: string;
  cache_time?: number;
}

export interface IAnswerCallbackQueryFetchOptions extends IAnswerCallbackQueryOptions {
  callback_query_id: string;
}

export interface IDefaultSendMediaConfig {
  thumb?: Thumb | null;
}

export interface IFile extends IGetFileFetchOptions {
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export interface IGetFileFetchOptions {
  file_id: string;
}

export interface IForwardMessageOptions {
  disable_notification?: boolean;
  protect_content?: boolean;
}

export interface IForwardMessageFetchOptions extends IForwardMessageOptions, IMessageId {
  chat_id: string | number;
  from_chat_id: string | number;
}

export interface ICopyMessageOptions extends ISendPhotoOptions {
  parse_mode?: ParseModes;
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  reply_markup?: ReplyMarkup;
}

export interface ICopyMessageFetchOptions extends ICopyMessageOptions, IMessageId {
  chat_id: number | string;
  from_chat_id: number | string;
}

export interface IMessageId {
  message_id: number;
}

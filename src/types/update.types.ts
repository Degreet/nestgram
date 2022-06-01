import { IChat, IUser } from './chat.types';

export type MessageEntityTypes =
  | 'mention'
  | 'hashtag'
  | 'cashtag'
  | 'bot_command'
  | 'url'
  | 'email'
  | 'phone_number'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strikethrough'
  | 'spoiler'
  | 'code'
  | 'pre'
  | 'text_link'
  | 'text_mention';

export interface IUpdate {
  update_id: number;
  message?: IMessage;
  edited_message?: IMessage;
  channel_post?: IMessage;
  edited_channel_post?: IMessage;
  callback_query?: ICallbackQuery;
  //!
}

export interface ICallbackQuery {
  id: string;
  from: IUser;
  message?: IMessage;
  inline_message_id?: string;
  chat_instance?: string;
  data?: string;
  game_short_name?: string;
}

export interface IMessageEntity {
  type: MessageEntityTypes;
  offset: number;
  length: number;
  url?: string;
  user?: IUser;
  language?: string;
}

export interface IEntity extends IMessageEntity {
  result: string;
}

export interface IMessage {
  message_id: number;
  from?: IUser;
  sender_chat?: IChat;
  date: number;
  chat: IChat;
  forward_from?: IUser;
  forward_from_chat?: IChat;
  forward_from_message_id?: number;
  forward_signature?: string;
  forward_sender_name?: string;
  forward_date?: number;
  is_automatic_forward?: true;
  reply_to_message?: IMessage;
  via_bot?: IUser;
  edit_date?: number;
  has_protected_content?: true;
  media_group_id?: string;
  author_signature?: string;
  text?: string;
  entities?: IMessageEntity[];
  animation?: any; //!
  audio?: any; //!
  document?: any; //!
  photo?: any[]; //!
  sticker?: any; //!
  video?: any; //!
  video_note?: any; //!
  voice?: any; //!
  caption?: string;
  caption_entities?: IMessageEntity[];
  contact?: any; //!
  dice?: any; //!
  game?: any; //!
  poll?: any; //!
  venue?: any; //!
  location?: any; //!
  new_chat_members?: IUser[];
  left_chat_member?: IUser;
  new_chat_title?: string;
  new_chat_photo?: any[]; //!
  delete_chat_photo?: true;
  group_chat_created?: true;
  supergroup_chat_created?: true;
  channel_chat_created?: true;
  message_auto_delete_timer_changed?: any; //!
  migrate_to_chat_id?: number;
  migrate_from_chat_id?: number;
  pinned_message?: IMessage;
  invoice?: any; //!
  successful_payment?: any; //!
  connected_website?: string;
  passport_data?: any; //!
  proximity_alert_triggered?: any; //!
  video_chat_scheduled?: any; //!
  video_chat_started?: any; //!
  video_chat_ended?: any; //!
  video_chat_participants_invited?: any; //!
  web_app_data?: any; //!
  reply_markup?: any; //!
}

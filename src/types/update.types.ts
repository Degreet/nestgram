import { IChat, IUser } from './chat.types';
import { IReplyMarkup } from './keyboard.types';
import { DiceEmojis, PollTypes } from './api.types';

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
  poll?: IPoll;
  poll_answer?: IPollAnswer;
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
  animation?: IAnimation;
  audio?: IAudio;
  document?: IDocument;
  photo?: IPhotoSize[];
  sticker?: any; //!
  video?: IVideo;
  video_note?: IVideoNote;
  voice?: IVoice;
  caption?: string;
  caption_entities?: IMessageEntity[];
  contact?: IContact;
  dice?: IDice;
  game?: any; //!
  poll?: IPoll;
  venue?: IVenue;
  location?: ILocation;
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
  reply_markup?: IReplyMarkup; //!
}

interface IDefaultFileOptions {
  file_id: string;
  file_unique_id: string;
}

interface IBasicFileOptions {
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface IAudio extends IDefaultFileOptions, IBasicFileOptions {
  duration: number;
  performer?: string;
  title?: string;
  thumb?: IPhotoSize;
}

export interface IAnimation extends IDefaultFileOptions, IBasicFileOptions {
  width: number;
  height: number;
  duration: number;
  thumb?: IPhotoSize;
}

export interface IDocument extends IDefaultFileOptions, IBasicFileOptions {
  thumb?: IPhotoSize;
}

export interface IPhotoSize extends IDefaultFileOptions {
  width: number;
  height: number;
  file_size?: number;
}

export interface IVideo extends IDefaultFileOptions, IBasicFileOptions {
  width: number;
  height: number;
  duration: number;
  thumb?: IPhotoSize[];
}

export interface IVideoNote extends IDefaultFileOptions, IBasicFileOptions {
  length: number;
  duration: number;
  thumb?: IPhotoSize[];
}

export interface IVoice extends IDefaultFileOptions, IBasicFileOptions {
  duration: number;
}

export interface ILocation {
  longitude: number;
  latitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

export interface IVenue {
  location: ILocation;
  title: string;
  address: string;
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
}

export interface IContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
  vcard?: string;
}

export interface IPollOption {
  text: string;
  voter_count: number;
}

export interface IPoll {
  id: string;
  question: string;
  options: IPollOption[];
  total_voter_count: number;
  is_closed: boolean;
  is_anonymous: boolean;
  type: PollTypes;
  allows_multiple_answers: boolean;
  correct_option_id?: number;
  explanation?: string;
  explanation_entities?: IMessageEntity[];
  open_period?: number;
  close_date?: number;
}

export interface IPollAnswer {
  poll_id: string;
  user: IUser;
  option_ids: number[];
}

export interface IDice {
  emoji: DiceEmojis;
  value: number;
}

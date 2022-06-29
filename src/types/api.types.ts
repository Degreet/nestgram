import { IMessageEntity, IPhotoSize } from './update.types';
import { IInlineKeyboard, IReplyMarkup } from './keyboard.types';
import { InputMediaTypes } from './media.types';
import { Thumb } from '../classes';
import { IChatPermissions, IUser } from './chat.types';

export type IOptions = ISendOptions | ISendPhotoOptions | ISendVideoOptions;
export type ParseModes = 'HTML' | 'Markdown' | 'MarkdownV2';
export type PollTypes = 'quiz' | 'regular';
export type DiceEmojis = '🎲' | '🎯' | '🏀' | '⚽' | '🎳' | '🎰';

export type ChatActions =
  | 'typing'
  | 'upload_photo'
  | 'record_video'
  | 'upload_video'
  | 'record_voice'
  | 'upload_voice'
  | 'upload_document'
  | 'choose_sticker'
  | 'find_location'
  | 'record_video_note'
  | 'upload_video_note';

export interface ISendFetchOptions extends ISendOptions {
  chat_id: number | string;
  text: string;
}

export interface IDefaultOptions {
  disable_notification?: boolean;
  protect_content?: boolean;
  reply_to_message_id?: number;
  allow_sending_without_reply?: boolean;
  reply_markup?: IReplyMarkup;
}

export interface ISendOptions extends IDefaultOptions {
  parse_mode?: ParseModes;
  entities?: IMessageEntity[];
}

export interface ISendMediaGroupFetchOptions extends ISendMediaGroupOptions {
  chat_id: number | string;
  media: InputMediaTypes[];
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

export interface ISendVideoFetchOptions extends ISendVideoOptions {
  chat_id: number | string;
  video?: string | any; // configures in form data
}

export interface ISendVideoNoteOptions extends ISendPhotoOptions {
  duration?: number;
  length?: number;
}

export interface ISendVideoNoteFetchOptions extends ISendVideoNoteOptions {
  chat_id: number | string;
  video_note?: string | any; // configures in form data
}

export interface ISendDocumentFetchOptions extends ISendDocumentOptions {
  chat_id: number | string;
  document?: string | any; // configures in form data
}

export interface ISendAnimationFetchOptions extends ISendAnimationOptions {
  chat_id: number | string;
  animation?: string | any; // configures in form data
}

export interface ISendAnimationOptions extends ISendPhotoOptions {
  duration?: number;
  width?: number;
  height?: number;
}

export interface ISendAudioFetchOptions extends ISendAudioOptions {
  chat_id: number | string;
  audio?: string | any; // configures in form data
}

export interface ISendAudioOptions extends ISendPhotoOptions {
  duration?: number;
  width?: number;
  height?: number;
}

export interface ISendVoiceFetchOptions extends ISendVoiceOptions {
  chat_id: number | string;
  voice?: string | any; // configures in form data
}

export interface ISendVoiceOptions extends ISendPhotoOptions {
  duration?: number;
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

export interface ICopyMessageOptions extends ISendPhotoOptions, IDefaultOptions {
  parse_mode?: ParseModes;
}

export interface ICopyMessageFetchOptions extends ICopyMessageOptions, IMessageId {
  chat_id: number | string;
  from_chat_id: number | string;
}

export interface IMessageId {
  message_id: number;
}

export interface ISendLocationFetchOptions extends ISendLocationOptions {
  chat_id: number | string;
  latitude: number;
  longitude: number;
}

export interface ISendLocationOptions extends IDefaultOptions {
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

export interface IStopMessageLiveLocationFetchOptions {
  chat_id?: number | string;
  message_id?: number;
}

export interface IStopMessageLiveLocationOptions {
  inline_message_id?: number;
  reply_markup?: IInlineKeyboard;
}

export interface ISendVenueFetchOptions extends ISendVenueOptions {
  chat_id: string | number;
  latitude: number;
  longitude: number;
  title: string;
  address: string;
}

export interface ISendVenueOptions extends IDefaultOptions {
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
}

export interface ISendContactFetchOptions extends ISendContactOptions {
  chat_id: string | number;
  phone_number: string;
  first_name: string;
  last_name?: string;
}

export interface ISendContactOptions extends IDefaultOptions {
  vcard?: string;
}

export interface ISendPollFetchOptions extends ISendPollOptions {
  chat_id: number | string;
  question: string;
  options: string[];
}

export interface ISendPollOptions extends IDefaultOptions {
  type?: PollTypes;
  is_anonymous?: boolean;
  allows_multiple_answers?: boolean;
  correct_option_id?: number;
  explanation?: string;
  explanation_parse_mode?: string;
  explanation_entities?: IMessageEntity[];
  open_period?: number;
  close_date?: number;
  is_closed?: boolean;
}

export interface ISendChatActionFetchOptions {
  chat_id: number | string;
  action: ChatActions;
}

export interface ISendDiceFetchOptions extends ISendDiceOptions {
  chat_id: string | number;
  emoji?: DiceEmojis;
}

export interface IGetUserProfilePhotosFetchOptions {
  user_id: number;
  offset?: number;
  limit?: number;
}

export interface IUserProfilePhotos {
  total_count: number;
  photos: IPhotoSize[][];
}

export interface IWebhookInfo {
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  ip_address?: string;
  last_error_date?: number;
  last_error_message?: string;
  last_synchronization_error_date?: number;
  max_connections?: number;
  allowed_updates?: string[];
}

export interface IBanChatMemberFetchOptions {
  chat_id: number | string;
  user_id: number;
  until_date?: number;
  revoke_messages?: boolean;
}

export interface IUnbanChatMemberFetchOptions {
  chat_id: number | string;
  user_id: number;
  only_if_banned?: boolean;
}

export interface IRestrictChatMemberFetchOptions {
  chat_id: number | string;
  user_id: number;
  permissions: IChatPermissions;
  until_date?: number;
}

export interface IPromoteChatMemberFetchOptions extends IPromoteChatPermissions {
  chat_id: number | string;
  user_id: number;
}

export interface IPromoteChatPermissions {
  is_anonymous?: boolean;
  can_manage_chat?: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_delete_messages?: boolean;
  can_manage_video_chats?: boolean;
  can_restrict_members?: boolean;
  can_promote_members?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
}

export interface ISetChatAdministratorCustomTitle {
  chat_id: number | string;
  user_id: number;
  custom_title: string;
}

export interface IBanChatSenderChatFetchOptions {
  chat_id: number | string;
  sender_chat_id: number;
}

export interface ISetChatPermissionsFetchOptions {
  chat_id: number | string;
  permissions: IChatPermissions;
}

export interface IExportChatInviteLinkFetchOptions {
  chat_id: number | string;
}

export interface IChatInviteLink extends ICreateChatInviteLinkOptions {
  invite_link: string;
  creator: IUser;
  creates_join_request: boolean;
  is_primary: boolean;
  is_revoked: boolean;
}

export interface ICreateChatInviteLinkOptions {
  name?: string;
  expire_date?: number;
  member_limit?: number;
  pending_join_request_count?: number;
}

export interface IRevokeChatInviteLinkFetchOptions {
  chat_id: string | number;
  invite_link: string;
}

export interface IApproveChatJoinRequestFetchOptions {
  chat_id: string | number;
  user_id: number;
}

export interface ISetChatPhotoFetchOptions extends IDefaultSendMediaConfig {
  chat_id: number | string;
  photo?: string | any; // configures in form data
}

export interface ICreateChatInviteLinkFetchOptions
  extends ICreateChatInviteLinkOptions,
    IExportChatInviteLinkFetchOptions {}

export interface IDeleteChatPhoto extends IExportChatInviteLinkFetchOptions {}
export interface IDeclineChatJoinRequestFetchOptions extends IApproveChatJoinRequestFetchOptions {}

export interface ISendDiceOptions extends IDefaultOptions {}
export interface ISendMediaGroupOptions extends IDefaultOptions {}
export interface ISendDocumentOptions extends ISendPhotoOptions {}

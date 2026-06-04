/**
 * Raw Telegram Bot API wire types — GENERATED from the vendored ark0f spec by
 * `npm run generate`. Do not edit by hand. These are the wire shapes the engine
 * wraps into the rich event classes in lib/events; the bare names (User,
 * InputFile, InputMedia*) are hand-written and imported below.
 */
import { User } from './user';
import { InputFile } from '../api/input-file';
import {
  InputMediaAnimation,
  InputMediaAudio,
  InputMediaDocument,
  InputMediaPhoto,
  InputMediaVideo,
} from '../api/input-media';

export interface RawAffiliateInfo {
  affiliate_user?: User;
  affiliate_chat?: RawChat;
  commission_per_mille: number;
  amount: number;
  nanostar_amount?: number;
}

export interface RawAnimation {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumbnail?: RawPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface RawAudio {
  file_id: string;
  file_unique_id: string;
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
  thumbnail?: RawPhotoSize;
}

export type RawBackgroundFill =
  | RawBackgroundFillSolid
  | RawBackgroundFillGradient
  | RawBackgroundFillFreeformGradient;

export interface RawBackgroundFillFreeformGradient {
  type: 'freeform_gradient';
  colors: number[];
}

export interface RawBackgroundFillGradient {
  type: 'gradient';
  top_color: number;
  bottom_color: number;
  rotation_angle: number;
}

export interface RawBackgroundFillSolid {
  type: 'solid';
  color: number;
}

export type RawBackgroundType =
  | RawBackgroundTypeFill
  | RawBackgroundTypeWallpaper
  | RawBackgroundTypePattern
  | RawBackgroundTypeChatTheme;

export interface RawBackgroundTypeChatTheme {
  type: 'chat_theme';
  theme_name: string;
}

export interface RawBackgroundTypeFill {
  type: 'fill';
  fill: RawBackgroundFill;
  dark_theme_dimming: number;
}

export interface RawBackgroundTypePattern {
  type: 'pattern';
  document: RawDocument;
  fill: RawBackgroundFill;
  intensity: number;
  is_inverted?: true;
  is_moving?: true;
}

export interface RawBackgroundTypeWallpaper {
  type: 'wallpaper';
  document: RawDocument;
  dark_theme_dimming: number;
  is_blurred?: true;
  is_moving?: true;
}

export interface RawBirthdate {
  day: number;
  month: number;
  year?: number;
}

export interface RawBotCommand {
  command: string;
  description: string;
}

export type RawBotCommandScope =
  | RawBotCommandScopeDefault
  | RawBotCommandScopeAllPrivateChats
  | RawBotCommandScopeAllGroupChats
  | RawBotCommandScopeAllChatAdministrators
  | RawBotCommandScopeChat
  | RawBotCommandScopeChatAdministrators
  | RawBotCommandScopeChatMember;

export interface RawBotCommandScopeAllChatAdministrators {
  type: 'all_chat_administrators';
}

export interface RawBotCommandScopeAllGroupChats {
  type: 'all_group_chats';
}

export interface RawBotCommandScopeAllPrivateChats {
  type: 'all_private_chats';
}

export interface RawBotCommandScopeChat {
  type: 'chat';
  chat_id: number | string;
}

export interface RawBotCommandScopeChatAdministrators {
  type: 'chat_administrators';
  chat_id: number | string;
}

export interface RawBotCommandScopeChatMember {
  type: 'chat_member';
  chat_id: number | string;
  user_id: number;
}

export interface RawBotCommandScopeDefault {
  type: 'default';
}

export interface RawBotDescription {
  description: string;
}

export interface RawBotName {
  name: string;
}

export interface RawBotShortDescription {
  short_description: string;
}

export interface RawBusinessConnection {
  id: string;
  user: User;
  user_chat_id: number;
  date: number;
  can_reply: boolean;
  is_enabled: boolean;
}

export interface RawBusinessIntro {
  title?: string;
  message?: string;
  sticker?: RawSticker;
}

export interface RawBusinessLocation {
  address: string;
  location?: RawLocation;
}

export interface RawBusinessMessagesDeleted {
  business_connection_id: string;
  chat: RawChat;
  message_ids: number[];
}

export interface RawBusinessOpeningHours {
  time_zone_name: string;
  opening_hours: RawBusinessOpeningHoursInterval[];
}

export interface RawBusinessOpeningHoursInterval {
  opening_minute: number;
  closing_minute: number;
}

export type RawCallbackGame = Record<string, never>;

export interface RawCallbackQuery {
  id: string;
  from: User;
  message?: RawMaybeInaccessibleMessage;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;
}

export interface RawChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_forum?: true;
}

export interface RawChatAdministratorRights {
  is_anonymous: boolean;
  can_manage_chat: boolean;
  can_delete_messages: boolean;
  can_manage_video_chats: boolean;
  can_restrict_members: boolean;
  can_promote_members: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_post_stories: boolean;
  can_edit_stories: boolean;
  can_delete_stories: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
}

export interface RawChatBackground {
  type: RawBackgroundType;
}

export interface RawChatBoost {
  boost_id: string;
  add_date: number;
  expiration_date: number;
  source: RawChatBoostSource;
}

export interface RawChatBoostAdded {
  boost_count: number;
}

export interface RawChatBoostRemoved {
  chat: RawChat;
  boost_id: string;
  remove_date: number;
  source: RawChatBoostSource;
}

export type RawChatBoostSource =
  | RawChatBoostSourcePremium
  | RawChatBoostSourceGiftCode
  | RawChatBoostSourceGiveaway;

export interface RawChatBoostSourceGiftCode {
  source: 'gift_code';
  user: User;
}

export interface RawChatBoostSourceGiveaway {
  source: 'giveaway';
  giveaway_message_id: number;
  user?: User;
  prize_star_count?: number;
  is_unclaimed?: true;
}

export interface RawChatBoostSourcePremium {
  source: 'premium';
  user: User;
}

export interface RawChatBoostUpdated {
  chat: RawChat;
  boost: RawChatBoost;
}

export interface RawChatFullInfo {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
  is_forum?: true;
  accent_color_id: number;
  max_reaction_count: number;
  photo?: RawChatPhoto;
  active_usernames?: string[];
  birthdate?: RawBirthdate;
  business_intro?: RawBusinessIntro;
  business_location?: RawBusinessLocation;
  business_opening_hours?: RawBusinessOpeningHours;
  personal_chat?: RawChat;
  available_reactions?: RawReactionType[];
  background_custom_emoji_id?: string;
  profile_accent_color_id?: number;
  profile_background_custom_emoji_id?: string;
  emoji_status_custom_emoji_id?: string;
  emoji_status_expiration_date?: number;
  bio?: string;
  has_private_forwards?: true;
  has_restricted_voice_and_video_messages?: true;
  join_to_send_messages?: true;
  join_by_request?: true;
  description?: string;
  invite_link?: string;
  pinned_message?: RawMessage;
  permissions?: RawChatPermissions;
  can_send_gift?: true;
  can_send_paid_media?: true;
  slow_mode_delay?: number;
  unrestrict_boost_count?: number;
  message_auto_delete_time?: number;
  has_aggressive_anti_spam_enabled?: true;
  has_hidden_members?: true;
  has_protected_content?: true;
  has_visible_history?: true;
  sticker_set_name?: string;
  can_set_sticker_set?: true;
  custom_emoji_sticker_set_name?: string;
  linked_chat_id?: number;
  location?: RawChatLocation;
}

export interface RawChatInviteLink {
  invite_link: string;
  creator: User;
  creates_join_request: boolean;
  is_primary: boolean;
  is_revoked: boolean;
  name?: string;
  expire_date?: number;
  member_limit?: number;
  pending_join_request_count?: number;
  subscription_period?: number;
  subscription_price?: number;
}

export interface RawChatJoinRequest {
  chat: RawChat;
  from: User;
  user_chat_id: number;
  date: number;
  bio?: string;
  invite_link?: RawChatInviteLink;
}

export interface RawChatLocation {
  location: RawLocation;
  address: string;
}

export type RawChatMember =
  | RawChatMemberOwner
  | RawChatMemberAdministrator
  | RawChatMemberMember
  | RawChatMemberRestricted
  | RawChatMemberLeft
  | RawChatMemberBanned;

export interface RawChatMemberAdministrator {
  status: 'administrator';
  user: User;
  can_be_edited: boolean;
  is_anonymous: boolean;
  can_manage_chat: boolean;
  can_delete_messages: boolean;
  can_manage_video_chats: boolean;
  can_restrict_members: boolean;
  can_promote_members: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_post_stories: boolean;
  can_edit_stories: boolean;
  can_delete_stories: boolean;
  can_post_messages?: boolean;
  can_edit_messages?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
  custom_title?: string;
}

export interface RawChatMemberBanned {
  status: 'kicked';
  user: User;
  until_date: number;
}

export interface RawChatMemberLeft {
  status: 'left';
  user: User;
}

export interface RawChatMemberMember {
  status: 'member';
  user: User;
  until_date?: number;
}

export interface RawChatMemberOwner {
  status: 'creator';
  user: User;
  is_anonymous: boolean;
  custom_title?: string;
}

export interface RawChatMemberRestricted {
  status: 'restricted';
  user: User;
  is_member: boolean;
  can_send_messages: boolean;
  can_send_audios: boolean;
  can_send_documents: boolean;
  can_send_photos: boolean;
  can_send_videos: boolean;
  can_send_video_notes: boolean;
  can_send_voice_notes: boolean;
  can_send_polls: boolean;
  can_send_other_messages: boolean;
  can_add_web_page_previews: boolean;
  can_change_info: boolean;
  can_invite_users: boolean;
  can_pin_messages: boolean;
  can_manage_topics: boolean;
  until_date: number;
}

export interface RawChatMemberUpdated {
  chat: RawChat;
  from: User;
  date: number;
  old_chat_member: RawChatMember;
  new_chat_member: RawChatMember;
  invite_link?: RawChatInviteLink;
  via_join_request?: boolean;
  via_chat_folder_invite_link?: boolean;
}

export interface RawChatPermissions {
  can_send_messages?: boolean;
  can_send_audios?: boolean;
  can_send_documents?: boolean;
  can_send_photos?: boolean;
  can_send_videos?: boolean;
  can_send_video_notes?: boolean;
  can_send_voice_notes?: boolean;
  can_send_polls?: boolean;
  can_send_other_messages?: boolean;
  can_add_web_page_previews?: boolean;
  can_change_info?: boolean;
  can_invite_users?: boolean;
  can_pin_messages?: boolean;
  can_manage_topics?: boolean;
}

export interface RawChatPhoto {
  small_file_id: string;
  small_file_unique_id: string;
  big_file_id: string;
  big_file_unique_id: string;
}

export interface RawChatShared {
  request_id: number;
  chat_id: number;
  title?: string;
  username?: string;
  photo?: RawPhotoSize[];
}

export interface RawChosenInlineResult {
  result_id: string;
  from: User;
  location?: RawLocation;
  inline_message_id?: string;
  query: string;
}

export interface RawContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
  vcard?: string;
}

export interface RawCopyTextButton {
  text: string;
}

export interface RawDice {
  emoji: string;
  value: number;
}

export interface RawDocument {
  file_id: string;
  file_unique_id: string;
  thumbnail?: RawPhotoSize;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface RawEncryptedCredentials {
  data: string;
  hash: string;
  secret: string;
}

export interface RawEncryptedPassportElement {
  type:
    | 'personal_details'
    | 'passport'
    | 'driver_license'
    | 'identity_card'
    | 'internal_passport'
    | 'address'
    | 'utility_bill'
    | 'bank_statement'
    | 'rental_agreement'
    | 'passport_registration'
    | 'temporary_registration'
    | 'phone_number'
    | 'email';
  data?: string;
  phone_number?: string;
  email?: string;
  files?: RawPassportFile[];
  front_side?: RawPassportFile;
  reverse_side?: RawPassportFile;
  selfie?: RawPassportFile;
  translation?: RawPassportFile[];
  hash: string;
}

export interface RawExternalReplyInfo {
  origin: RawMessageOrigin;
  chat?: RawChat;
  message_id?: number;
  link_preview_options?: RawLinkPreviewOptions;
  animation?: RawAnimation;
  audio?: RawAudio;
  document?: RawDocument;
  paid_media?: RawPaidMediaInfo;
  photo?: RawPhotoSize[];
  sticker?: RawSticker;
  story?: RawStory;
  video?: RawVideo;
  video_note?: RawVideoNote;
  voice?: RawVoice;
  has_media_spoiler?: true;
  contact?: RawContact;
  dice?: RawDice;
  game?: RawGame;
  giveaway?: RawGiveaway;
  giveaway_winners?: RawGiveawayWinners;
  invoice?: RawInvoice;
  location?: RawLocation;
  poll?: RawPoll;
  venue?: RawVenue;
}

export interface RawFile {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
  file_path?: string;
}

export interface RawForceReply {
  force_reply: true;
  input_field_placeholder?: string;
  selective?: boolean;
}

export interface RawForumTopic {
  message_thread_id: number;
  name: string;
  icon_color: number;
  icon_custom_emoji_id?: string;
}

export type RawForumTopicClosed = Record<string, never>;

export interface RawForumTopicCreated {
  name: string;
  icon_color: number;
  icon_custom_emoji_id?: string;
}

export interface RawForumTopicEdited {
  name?: string;
  icon_custom_emoji_id?: string;
}

export type RawForumTopicReopened = Record<string, never>;

export interface RawGame {
  title: string;
  description: string;
  photo: RawPhotoSize[];
  text?: string;
  text_entities?: RawMessageEntity[];
  animation?: RawAnimation;
}

export interface RawGameHighScore {
  position: number;
  user: User;
  score: number;
}

export type RawGeneralForumTopicHidden = Record<string, never>;

export type RawGeneralForumTopicUnhidden = Record<string, never>;

export interface RawGift {
  id: string;
  sticker: RawSticker;
  star_count: number;
  upgrade_star_count?: number;
  total_count?: number;
  remaining_count?: number;
}

export interface RawGifts {
  gifts: RawGift[];
}

export interface RawGiveaway {
  chats: RawChat[];
  winners_selection_date: number;
  winner_count: number;
  only_new_members?: true;
  has_public_winners?: true;
  prize_description?: string;
  country_codes?: string[];
  prize_star_count?: number;
  premium_subscription_month_count?: number;
}

export interface RawGiveawayCompleted {
  winner_count: number;
  unclaimed_prize_count?: number;
  giveaway_message?: RawMessage;
  is_star_giveaway?: true;
}

export interface RawGiveawayCreated {
  prize_star_count?: number;
}

export interface RawGiveawayWinners {
  chat: RawChat;
  giveaway_message_id: number;
  winners_selection_date: number;
  winner_count: number;
  winners: User[];
  additional_chat_count?: number;
  prize_star_count?: number;
  premium_subscription_month_count?: number;
  unclaimed_prize_count?: number;
  only_new_members?: true;
  was_refunded?: true;
  prize_description?: string;
}

export interface RawInaccessibleMessage {
  chat: RawChat;
  message_id: number;
  date: number;
}

export interface RawInlineKeyboardButton {
  text: string;
  url?: string;
  callback_data?: string;
  web_app?: RawWebAppInfo;
  login_url?: RawLoginUrl;
  switch_inline_query?: string;
  switch_inline_query_current_chat?: string;
  switch_inline_query_chosen_chat?: RawSwitchInlineQueryChosenChat;
  copy_text?: RawCopyTextButton;
  callback_game?: RawCallbackGame;
  pay?: boolean;
}

export interface RawInlineKeyboardMarkup {
  inline_keyboard: RawInlineKeyboardButton[][];
}

export interface RawInlineQuery {
  id: string;
  from: User;
  query: string;
  offset: string;
  chat_type?: 'sender' | 'private' | 'group' | 'supergroup' | 'channel';
  location?: RawLocation;
}

export type RawInlineQueryResult =
  | RawInlineQueryResultCachedAudio
  | RawInlineQueryResultCachedDocument
  | RawInlineQueryResultCachedGif
  | RawInlineQueryResultCachedMpeg4Gif
  | RawInlineQueryResultCachedPhoto
  | RawInlineQueryResultCachedSticker
  | RawInlineQueryResultCachedVideo
  | RawInlineQueryResultCachedVoice
  | RawInlineQueryResultArticle
  | RawInlineQueryResultAudio
  | RawInlineQueryResultContact
  | RawInlineQueryResultGame
  | RawInlineQueryResultDocument
  | RawInlineQueryResultGif
  | RawInlineQueryResultLocation
  | RawInlineQueryResultMpeg4Gif
  | RawInlineQueryResultPhoto
  | RawInlineQueryResultVenue
  | RawInlineQueryResultVideo
  | RawInlineQueryResultVoice;

export interface RawInlineQueryResultArticle {
  type: 'article';
  id: string;
  title: string;
  input_message_content: RawInputMessageContent;
  reply_markup?: RawInlineKeyboardMarkup;
  url?: string;
  description?: string;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

export interface RawInlineQueryResultAudio {
  type: 'audio';
  id: string;
  audio_url: string;
  title: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  performer?: string;
  audio_duration?: number;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultCachedAudio {
  type: 'audio';
  id: string;
  audio_file_id: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultCachedDocument {
  type: 'document';
  id: string;
  title: string;
  document_file_id: string;
  description?: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultCachedGif {
  type: 'gif';
  id: string;
  gif_file_id: string;
  title?: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultCachedMpeg4Gif {
  type: 'mpeg4_gif';
  id: string;
  mpeg4_file_id: string;
  title?: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultCachedPhoto {
  type: 'photo';
  id: string;
  photo_file_id: string;
  title?: string;
  description?: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultCachedSticker {
  type: 'sticker';
  id: string;
  sticker_file_id: string;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultCachedVideo {
  type: 'video';
  id: string;
  video_file_id: string;
  title: string;
  description?: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultCachedVoice {
  type: 'voice';
  id: string;
  voice_file_id: string;
  title: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultContact {
  type: 'contact';
  id: string;
  phone_number: string;
  first_name: string;
  last_name?: string;
  vcard?: string;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

export interface RawInlineQueryResultDocument {
  type: 'document';
  id: string;
  title: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  document_url: string;
  mime_type: 'application/pdf' | 'application/zip';
  description?: string;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

export interface RawInlineQueryResultGame {
  type: 'game';
  id: string;
  game_short_name: string;
  reply_markup?: RawInlineKeyboardMarkup;
}

export interface RawInlineQueryResultGif {
  type: 'gif';
  id: string;
  gif_url: string;
  gif_width?: number;
  gif_height?: number;
  gif_duration?: number;
  thumbnail_url: string;
  thumbnail_mime_type?: 'image/jpeg' | 'image/gif' | 'video/mp4';
  title?: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultLocation {
  type: 'location';
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

export interface RawInlineQueryResultMpeg4Gif {
  type: 'mpeg4_gif';
  id: string;
  mpeg4_url: string;
  mpeg4_width?: number;
  mpeg4_height?: number;
  mpeg4_duration?: number;
  thumbnail_url: string;
  thumbnail_mime_type?: 'image/jpeg' | 'image/gif' | 'video/mp4';
  title?: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultPhoto {
  type: 'photo';
  id: string;
  photo_url: string;
  thumbnail_url: string;
  photo_width?: number;
  photo_height?: number;
  title?: string;
  description?: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultsButton {
  text: string;
  web_app?: RawWebAppInfo;
  start_parameter?: string;
}

export interface RawInlineQueryResultVenue {
  type: 'venue';
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
  thumbnail_url?: string;
  thumbnail_width?: number;
  thumbnail_height?: number;
}

export interface RawInlineQueryResultVideo {
  type: 'video';
  id: string;
  video_url: string;
  mime_type: 'text/html' | 'video/mp4';
  thumbnail_url: string;
  title: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: boolean;
  video_width?: number;
  video_height?: number;
  video_duration?: number;
  description?: string;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInlineQueryResultVoice {
  type: 'voice';
  id: string;
  voice_url: string;
  title: string;
  caption?: string;
  parse_mode?: string;
  caption_entities?: RawMessageEntity[];
  voice_duration?: number;
  reply_markup?: RawInlineKeyboardMarkup;
  input_message_content?: RawInputMessageContent;
}

export interface RawInputContactMessageContent {
  phone_number: string;
  first_name: string;
  last_name?: string;
  vcard?: string;
}

export interface RawInputInvoiceMessageContent {
  title: string;
  description: string;
  payload: string;
  provider_token?: string;
  currency: string;
  prices: RawLabeledPrice[];
  max_tip_amount?: number;
  suggested_tip_amounts?: number[];
  provider_data?: string;
  photo_url?: string;
  photo_size?: number;
  photo_width?: number;
  photo_height?: number;
  need_name?: boolean;
  need_phone_number?: boolean;
  need_email?: boolean;
  need_shipping_address?: boolean;
  send_phone_number_to_provider?: boolean;
  send_email_to_provider?: boolean;
  is_flexible?: boolean;
}

export interface RawInputLocationMessageContent {
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

export type RawInputMedia =
  | InputMediaAnimation
  | InputMediaDocument
  | InputMediaAudio
  | InputMediaPhoto
  | InputMediaVideo;

export type RawInputMessageContent =
  | RawInputTextMessageContent
  | RawInputLocationMessageContent
  | RawInputVenueMessageContent
  | RawInputContactMessageContent
  | RawInputInvoiceMessageContent;

export type RawInputPaidMedia = RawInputPaidMediaPhoto | RawInputPaidMediaVideo;

export interface RawInputPaidMediaPhoto {
  type: 'photo';
  media: string;
}

export interface RawInputPaidMediaVideo {
  type: 'video';
  media: string;
  thumbnail?: string;
  cover?: string;
  start_timestamp?: number;
  width?: number;
  height?: number;
  duration?: number;
  supports_streaming?: boolean;
}

export interface RawInputPollOption {
  text: string;
  text_parse_mode?: string;
  text_entities?: RawMessageEntity[];
}

export interface RawInputSticker {
  sticker: InputFile | string;
  format: 'static' | 'animated' | 'video';
  emoji_list: string[];
  mask_position?: RawMaskPosition;
  keywords?: string[];
}

export interface RawInputTextMessageContent {
  message_text: string;
  parse_mode?: string;
  entities?: RawMessageEntity[];
  link_preview_options?: RawLinkPreviewOptions;
}

export interface RawInputVenueMessageContent {
  latitude: number;
  longitude: number;
  title: string;
  address: string;
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
}

export interface RawInvoice {
  title: string;
  description: string;
  start_parameter: string;
  currency: string;
  total_amount: number;
}

export interface RawKeyboardButton {
  text: string;
  request_users?: RawKeyboardButtonRequestUsers;
  request_chat?: RawKeyboardButtonRequestChat;
  request_contact?: boolean;
  request_location?: boolean;
  request_poll?: RawKeyboardButtonPollType;
  web_app?: RawWebAppInfo;
}

export interface RawKeyboardButtonPollType {
  type?: string;
}

export interface RawKeyboardButtonRequestChat {
  request_id: number;
  chat_is_channel: boolean;
  chat_is_forum?: boolean;
  chat_has_username?: boolean;
  chat_is_created?: boolean;
  user_administrator_rights?: RawChatAdministratorRights;
  bot_administrator_rights?: RawChatAdministratorRights;
  bot_is_member?: boolean;
  request_title?: boolean;
  request_username?: boolean;
  request_photo?: boolean;
}

export interface RawKeyboardButtonRequestUsers {
  request_id: number;
  user_is_bot?: boolean;
  user_is_premium?: boolean;
  max_quantity?: number;
  request_name?: boolean;
  request_username?: boolean;
  request_photo?: boolean;
}

export interface RawLabeledPrice {
  label: string;
  amount: number;
}

export interface RawLinkPreviewOptions {
  is_disabled?: boolean;
  url?: string;
  prefer_small_media?: boolean;
  prefer_large_media?: boolean;
  show_above_text?: boolean;
}

export interface RawLocation {
  latitude: number;
  longitude: number;
  horizontal_accuracy?: number;
  live_period?: number;
  heading?: number;
  proximity_alert_radius?: number;
}

export interface RawLoginUrl {
  url: string;
  forward_text?: string;
  bot_username?: string;
  request_write_access?: boolean;
}

export interface RawMaskPosition {
  point: 'forehead' | 'eyes' | 'mouth' | 'chin';
  x_shift: number;
  y_shift: number;
  scale: number;
}

export type RawMaybeInaccessibleMessage = RawMessage | RawInaccessibleMessage;

export type RawMenuButton =
  | RawMenuButtonCommands
  | RawMenuButtonWebApp
  | RawMenuButtonDefault;

export interface RawMenuButtonCommands {
  type: 'commands';
}

export interface RawMenuButtonDefault {
  type: 'default';
}

export interface RawMenuButtonWebApp {
  type: 'web_app';
  text: string;
  web_app: RawWebAppInfo;
}

export interface RawMessage {
  message_id: number;
  message_thread_id?: number;
  from?: User;
  sender_chat?: RawChat;
  sender_boost_count?: number;
  sender_business_bot?: User;
  date: number;
  business_connection_id?: string;
  chat: RawChat;
  forward_origin?: RawMessageOrigin;
  is_topic_message?: true;
  is_automatic_forward?: true;
  reply_to_message?: RawMessage;
  external_reply?: RawExternalReplyInfo;
  quote?: RawTextQuote;
  reply_to_story?: RawStory;
  via_bot?: User;
  edit_date?: number;
  has_protected_content?: true;
  is_from_offline?: true;
  media_group_id?: string;
  author_signature?: string;
  text?: string;
  entities?: RawMessageEntity[];
  link_preview_options?: RawLinkPreviewOptions;
  effect_id?: string;
  animation?: RawAnimation;
  audio?: RawAudio;
  document?: RawDocument;
  paid_media?: RawPaidMediaInfo;
  photo?: RawPhotoSize[];
  sticker?: RawSticker;
  story?: RawStory;
  video?: RawVideo;
  video_note?: RawVideoNote;
  voice?: RawVoice;
  caption?: string;
  caption_entities?: RawMessageEntity[];
  show_caption_above_media?: true;
  has_media_spoiler?: true;
  contact?: RawContact;
  dice?: RawDice;
  game?: RawGame;
  poll?: RawPoll;
  venue?: RawVenue;
  location?: RawLocation;
  new_chat_members?: User[];
  left_chat_member?: User;
  new_chat_title?: string;
  new_chat_photo?: RawPhotoSize[];
  delete_chat_photo?: true;
  group_chat_created?: true;
  supergroup_chat_created?: true;
  channel_chat_created?: true;
  message_auto_delete_timer_changed?: RawMessageAutoDeleteTimerChanged;
  migrate_to_chat_id?: number;
  migrate_from_chat_id?: number;
  pinned_message?: RawMaybeInaccessibleMessage;
  invoice?: RawInvoice;
  successful_payment?: RawSuccessfulPayment;
  refunded_payment?: RawRefundedPayment;
  users_shared?: RawUsersShared;
  chat_shared?: RawChatShared;
  connected_website?: string;
  write_access_allowed?: RawWriteAccessAllowed;
  passport_data?: RawPassportData;
  proximity_alert_triggered?: RawProximityAlertTriggered;
  boost_added?: RawChatBoostAdded;
  chat_background_set?: RawChatBackground;
  forum_topic_created?: RawForumTopicCreated;
  forum_topic_edited?: RawForumTopicEdited;
  forum_topic_closed?: RawForumTopicClosed;
  forum_topic_reopened?: RawForumTopicReopened;
  general_forum_topic_hidden?: RawGeneralForumTopicHidden;
  general_forum_topic_unhidden?: RawGeneralForumTopicUnhidden;
  giveaway_created?: RawGiveawayCreated;
  giveaway?: RawGiveaway;
  giveaway_winners?: RawGiveawayWinners;
  giveaway_completed?: RawGiveawayCompleted;
  video_chat_scheduled?: RawVideoChatScheduled;
  video_chat_started?: RawVideoChatStarted;
  video_chat_ended?: RawVideoChatEnded;
  video_chat_participants_invited?: RawVideoChatParticipantsInvited;
  web_app_data?: RawWebAppData;
  reply_markup?: RawInlineKeyboardMarkup;
}

export interface RawMessageAutoDeleteTimerChanged {
  message_auto_delete_time: number;
}

export interface RawMessageEntity {
  type:
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
    | 'blockquote'
    | 'expandable_blockquote'
    | 'code'
    | 'pre'
    | 'text_link'
    | 'text_mention'
    | 'custom_emoji';
  offset: number;
  length: number;
  url?: string;
  user?: User;
  language?: string;
  custom_emoji_id?: string;
}

export interface RawMessageId {
  message_id: number;
}

export type RawMessageOrigin =
  | RawMessageOriginUser
  | RawMessageOriginHiddenUser
  | RawMessageOriginChat
  | RawMessageOriginChannel;

export interface RawMessageOriginChannel {
  type: 'channel';
  date: number;
  chat: RawChat;
  message_id: number;
  author_signature?: string;
}

export interface RawMessageOriginChat {
  type: 'chat';
  date: number;
  sender_chat: RawChat;
  author_signature?: string;
}

export interface RawMessageOriginHiddenUser {
  type: 'hidden_user';
  date: number;
  sender_user_name: string;
}

export interface RawMessageOriginUser {
  type: 'user';
  date: number;
  sender_user: User;
}

export interface RawMessageReactionCountUpdated {
  chat: RawChat;
  message_id: number;
  date: number;
  reactions: RawReactionCount[];
}

export interface RawMessageReactionUpdated {
  chat: RawChat;
  message_id: number;
  user?: User;
  actor_chat?: RawChat;
  date: number;
  old_reaction: RawReactionType[];
  new_reaction: RawReactionType[];
}

export interface RawOrderInfo {
  name?: string;
  phone_number?: string;
  email?: string;
  shipping_address?: RawShippingAddress;
}

export type RawPaidMedia =
  | RawPaidMediaPreview
  | RawPaidMediaPhoto
  | RawPaidMediaVideo;

export interface RawPaidMediaInfo {
  star_count: number;
  paid_media: RawPaidMedia[];
}

export interface RawPaidMediaPhoto {
  type: 'photo';
  photo: RawPhotoSize[];
}

export interface RawPaidMediaPreview {
  type: 'preview';
  width?: number;
  height?: number;
  duration?: number;
}

export interface RawPaidMediaPurchased {
  from: User;
  paid_media_payload: string;
}

export interface RawPaidMediaVideo {
  type: 'video';
  video: RawVideo;
}

export interface RawPassportData {
  data: RawEncryptedPassportElement[];
  credentials: RawEncryptedCredentials;
}

export type RawPassportElementError =
  | RawPassportElementErrorDataField
  | RawPassportElementErrorFrontSide
  | RawPassportElementErrorReverseSide
  | RawPassportElementErrorSelfie
  | RawPassportElementErrorFile
  | RawPassportElementErrorFiles
  | RawPassportElementErrorTranslationFile
  | RawPassportElementErrorTranslationFiles
  | RawPassportElementErrorUnspecified;

export interface RawPassportElementErrorDataField {
  source: 'data';
  type:
    | 'personal_details'
    | 'passport'
    | 'driver_license'
    | 'identity_card'
    | 'internal_passport'
    | 'address';
  field_name: string;
  data_hash: string;
  message: string;
}

export interface RawPassportElementErrorFile {
  source: 'file';
  type:
    | 'utility_bill'
    | 'bank_statement'
    | 'rental_agreement'
    | 'passport_registration'
    | 'temporary_registration';
  file_hash: string;
  message: string;
}

export interface RawPassportElementErrorFiles {
  source: 'files';
  type:
    | 'utility_bill'
    | 'bank_statement'
    | 'rental_agreement'
    | 'passport_registration'
    | 'temporary_registration';
  file_hashes: string[];
  message: string;
}

export interface RawPassportElementErrorFrontSide {
  source: 'front_side';
  type: 'passport' | 'driver_license' | 'identity_card' | 'internal_passport';
  file_hash: string;
  message: string;
}

export interface RawPassportElementErrorReverseSide {
  source: 'reverse_side';
  type: 'driver_license' | 'identity_card';
  file_hash: string;
  message: string;
}

export interface RawPassportElementErrorSelfie {
  source: 'selfie';
  type: 'passport' | 'driver_license' | 'identity_card' | 'internal_passport';
  file_hash: string;
  message: string;
}

export interface RawPassportElementErrorTranslationFile {
  source: 'translation_file';
  type:
    | 'passport'
    | 'driver_license'
    | 'identity_card'
    | 'internal_passport'
    | 'utility_bill'
    | 'bank_statement'
    | 'rental_agreement'
    | 'passport_registration'
    | 'temporary_registration';
  file_hash: string;
  message: string;
}

export interface RawPassportElementErrorTranslationFiles {
  source: 'translation_files';
  type:
    | 'passport'
    | 'driver_license'
    | 'identity_card'
    | 'internal_passport'
    | 'utility_bill'
    | 'bank_statement'
    | 'rental_agreement'
    | 'passport_registration'
    | 'temporary_registration';
  file_hashes: string[];
  message: string;
}

export interface RawPassportElementErrorUnspecified {
  source: 'unspecified';
  type: string;
  element_hash: string;
  message: string;
}

export interface RawPassportFile {
  file_id: string;
  file_unique_id: string;
  file_size: number;
  file_date: number;
}

export interface RawPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

export interface RawPoll {
  id: string;
  question: string;
  question_entities?: RawMessageEntity[];
  options: RawPollOption[];
  total_voter_count: number;
  is_closed: boolean;
  is_anonymous: boolean;
  type: 'regular' | 'quiz';
  allows_multiple_answers: boolean;
  correct_option_id?: number;
  explanation?: string;
  explanation_entities?: RawMessageEntity[];
  open_period?: number;
  close_date?: number;
}

export interface RawPollAnswer {
  poll_id: string;
  voter_chat?: RawChat;
  user?: User;
  option_ids: number[];
}

export interface RawPollOption {
  text: string;
  text_entities?: RawMessageEntity[];
  voter_count: number;
}

export interface RawPreCheckoutQuery {
  id: string;
  from: User;
  currency: string;
  total_amount: number;
  invoice_payload: string;
  shipping_option_id?: string;
  order_info?: RawOrderInfo;
}

export interface RawPreparedInlineMessage {
  id: string;
  expiration_date: number;
}

export interface RawProximityAlertTriggered {
  traveler: User;
  watcher: User;
  distance: number;
}

export interface RawReactionCount {
  type: RawReactionType;
  total_count: number;
}

export type RawReactionType =
  | RawReactionTypeEmoji
  | RawReactionTypeCustomEmoji
  | RawReactionTypePaid;

export interface RawReactionTypeCustomEmoji {
  type: 'custom_emoji';
  custom_emoji_id: string;
}

export interface RawReactionTypeEmoji {
  type: 'emoji';
  emoji:
    | '👍'
    | '👎'
    | '❤'
    | '🔥'
    | '🥰'
    | '👏'
    | '😁'
    | '🤔'
    | '🤯'
    | '😱'
    | '🤬'
    | '😢'
    | '🎉'
    | '🤩'
    | '🤮'
    | '💩'
    | '🙏'
    | '👌'
    | '🕊'
    | '🤡'
    | '🥱'
    | '🥴'
    | '😍'
    | '🐳'
    | '❤‍🔥'
    | '🌚'
    | '🌭'
    | '💯'
    | '🤣'
    | '⚡'
    | '🍌'
    | '🏆'
    | '💔'
    | '🤨'
    | '😐'
    | '🍓'
    | '🍾'
    | '💋'
    | '🖕'
    | '😈'
    | '😴'
    | '😭'
    | '🤓'
    | '👻'
    | '👨‍💻'
    | '👀'
    | '🎃'
    | '🙈'
    | '😇'
    | '😨'
    | '🤝'
    | '✍'
    | '🤗'
    | '🫡'
    | '🎅'
    | '🎄'
    | '☃'
    | '💅'
    | '🤪'
    | '🗿'
    | '🆒'
    | '💘'
    | '🙉'
    | '🦄'
    | '😘'
    | '💊'
    | '🙊'
    | '😎'
    | '👾'
    | '🤷‍♂'
    | '🤷'
    | '🤷‍♀'
    | '😡';
}

export interface RawReactionTypePaid {
  type: 'paid';
}

export interface RawRefundedPayment {
  currency: 'XTR';
  total_amount: number;
  invoice_payload: string;
  telegram_payment_charge_id: string;
  provider_payment_charge_id?: string;
}

export interface RawReplyKeyboardMarkup {
  keyboard: RawKeyboardButton[][];
  is_persistent?: boolean;
  resize_keyboard?: boolean;
  one_time_keyboard?: boolean;
  input_field_placeholder?: string;
  selective?: boolean;
}

export interface RawReplyKeyboardRemove {
  remove_keyboard: true;
  selective?: boolean;
}

export interface RawReplyParameters {
  message_id: number;
  chat_id?: number | string;
  allow_sending_without_reply?: boolean;
  quote?: string;
  quote_parse_mode?: string;
  quote_entities?: RawMessageEntity[];
  quote_position?: number;
}

export interface RawResponseParameters {
  migrate_to_chat_id?: number;
  retry_after?: number;
}

export type RawRevenueWithdrawalState =
  | RawRevenueWithdrawalStatePending
  | RawRevenueWithdrawalStateSucceeded
  | RawRevenueWithdrawalStateFailed;

export interface RawRevenueWithdrawalStateFailed {
  type: 'failed';
}

export interface RawRevenueWithdrawalStatePending {
  type: 'pending';
}

export interface RawRevenueWithdrawalStateSucceeded {
  type: 'succeeded';
  date: number;
  url: string;
}

export interface RawSentWebAppMessage {
  inline_message_id?: string;
}

export interface RawSharedUser {
  user_id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  photo?: RawPhotoSize[];
}

export interface RawShippingAddress {
  country_code: string;
  state: string;
  city: string;
  street_line1: string;
  street_line2: string;
  post_code: string;
}

export interface RawShippingOption {
  id: string;
  title: string;
  prices: RawLabeledPrice[];
}

export interface RawShippingQuery {
  id: string;
  from: User;
  invoice_payload: string;
  shipping_address: RawShippingAddress;
}

export interface RawStarTransaction {
  id: string;
  amount: number;
  nanostar_amount?: number;
  date: number;
  source?: RawTransactionPartner;
  receiver?: RawTransactionPartner;
}

export interface RawStarTransactions {
  transactions: RawStarTransaction[];
}

export interface RawSticker {
  file_id: string;
  file_unique_id: string;
  type: 'regular' | 'mask' | 'custom_emoji';
  width: number;
  height: number;
  is_animated: boolean;
  is_video: boolean;
  thumbnail?: RawPhotoSize;
  emoji?: string;
  set_name?: string;
  premium_animation?: RawFile;
  mask_position?: RawMaskPosition;
  custom_emoji_id?: string;
  needs_repainting?: true;
  file_size?: number;
}

export interface RawStickerSet {
  name: string;
  title: string;
  sticker_type: 'regular' | 'mask' | 'custom_emoji';
  stickers: RawSticker[];
  thumbnail?: RawPhotoSize;
}

export interface RawStory {
  chat: RawChat;
  id: number;
}

export interface RawSuccessfulPayment {
  currency: string;
  total_amount: number;
  invoice_payload: string;
  subscription_expiration_date?: number;
  is_recurring?: true;
  is_first_recurring?: true;
  shipping_option_id?: string;
  order_info?: RawOrderInfo;
  telegram_payment_charge_id: string;
  provider_payment_charge_id: string;
}

export interface RawSwitchInlineQueryChosenChat {
  query?: string;
  allow_user_chats?: boolean;
  allow_bot_chats?: boolean;
  allow_group_chats?: boolean;
  allow_channel_chats?: boolean;
}

export interface RawTextQuote {
  text: string;
  entities?: RawMessageEntity[];
  position: number;
  is_manual?: true;
}

export type RawTransactionPartner =
  | RawTransactionPartnerUser
  | RawTransactionPartnerChat
  | RawTransactionPartnerAffiliateProgram
  | RawTransactionPartnerFragment
  | RawTransactionPartnerTelegramAds
  | RawTransactionPartnerTelegramApi
  | RawTransactionPartnerOther;

export interface RawTransactionPartnerAffiliateProgram {
  type: 'affiliate_program';
  sponsor_user?: User;
  commission_per_mille: number;
}

export interface RawTransactionPartnerChat {
  type: 'chat';
  chat: RawChat;
  gift?: RawGift;
}

export interface RawTransactionPartnerFragment {
  type: 'fragment';
  withdrawal_state?: RawRevenueWithdrawalState;
}

export interface RawTransactionPartnerOther {
  type: 'other';
}

export interface RawTransactionPartnerTelegramAds {
  type: 'telegram_ads';
}

export interface RawTransactionPartnerTelegramApi {
  type: 'telegram_api';
  request_count: number;
}

export interface RawTransactionPartnerUser {
  type: 'user';
  user: User;
  affiliate?: RawAffiliateInfo;
  invoice_payload?: string;
  subscription_period?: number;
  paid_media?: RawPaidMedia[];
  paid_media_payload?: string;
  gift?: RawGift;
}

export interface RawUpdate {
  update_id: number;
  message?: RawMessage;
  edited_message?: RawMessage;
  channel_post?: RawMessage;
  edited_channel_post?: RawMessage;
  business_connection?: RawBusinessConnection;
  business_message?: RawMessage;
  edited_business_message?: RawMessage;
  deleted_business_messages?: RawBusinessMessagesDeleted;
  message_reaction?: RawMessageReactionUpdated;
  message_reaction_count?: RawMessageReactionCountUpdated;
  inline_query?: RawInlineQuery;
  chosen_inline_result?: RawChosenInlineResult;
  callback_query?: RawCallbackQuery;
  shipping_query?: RawShippingQuery;
  pre_checkout_query?: RawPreCheckoutQuery;
  purchased_paid_media?: RawPaidMediaPurchased;
  poll?: RawPoll;
  poll_answer?: RawPollAnswer;
  my_chat_member?: RawChatMemberUpdated;
  chat_member?: RawChatMemberUpdated;
  chat_join_request?: RawChatJoinRequest;
  chat_boost?: RawChatBoostUpdated;
  removed_chat_boost?: RawChatBoostRemoved;
}

export interface RawUserChatBoosts {
  boosts: RawChatBoost[];
}

export interface RawUserProfilePhotos {
  total_count: number;
  photos: RawPhotoSize[][];
}

export interface RawUsersShared {
  request_id: number;
  users: RawSharedUser[];
}

export interface RawVenue {
  location: RawLocation;
  title: string;
  address: string;
  foursquare_id?: string;
  foursquare_type?: string;
  google_place_id?: string;
  google_place_type?: string;
}

export interface RawVideo {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  duration: number;
  thumbnail?: RawPhotoSize;
  cover?: RawPhotoSize[];
  start_timestamp?: number;
  file_name?: string;
  mime_type?: string;
  file_size?: number;
}

export interface RawVideoChatEnded {
  duration: number;
}

export interface RawVideoChatParticipantsInvited {
  users: User[];
}

export interface RawVideoChatScheduled {
  start_date: number;
}

export type RawVideoChatStarted = Record<string, never>;

export interface RawVideoNote {
  file_id: string;
  file_unique_id: string;
  length: number;
  duration: number;
  thumbnail?: RawPhotoSize;
  file_size?: number;
}

export interface RawVoice {
  file_id: string;
  file_unique_id: string;
  duration: number;
  mime_type?: string;
  file_size?: number;
}

export interface RawWebAppData {
  data: string;
  button_text: string;
}

export interface RawWebAppInfo {
  url: string;
}

export interface RawWebhookInfo {
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

export interface RawWriteAccessAllowed {
  from_request?: boolean;
  web_app_name?: string;
  from_attachment_menu?: boolean;
}

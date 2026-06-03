import { User } from './user';

/**
 * Raw Telegram Bot API payload types — the wire shape, distinct from the rich
 * event classes in `lib/events`. The engine wraps these in a
 * `TelegramExecutionContext` rather than mutating them.
 *
 * Hand-written for Phase 1 (a minimal, accurate subset). Phase 2 replaces this
 * file with types generated from a community Bot API spec.
 */

/** Bot API `Chat` (minimal subset used by the engine). */
export interface RawChat {
  id: number;
  type: 'private' | 'group' | 'supergroup' | 'channel';
  title?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}

/** Bot API `MessageEntity` (minimal subset). */
export interface RawMessageEntity {
  type: string;
  offset: number;
  length: number;
  url?: string;
  user?: User;
  language?: string;
  custom_emoji_id?: string;
}

/** Fields common to every downloadable file (photo size, video, document, …). */
export interface RawFileBase {
  file_id: string;
  file_unique_id: string;
  file_size?: number;
}

/** Bot API `PhotoSize` — one resolution of a photo. */
export interface RawPhotoSize extends RawFileBase {
  width: number;
  height: number;
}

/** Bot API `Video`. */
export interface RawVideo extends RawFileBase {
  width: number;
  height: number;
  duration: number;
  file_name?: string;
  mime_type?: string;
  thumbnail?: RawPhotoSize;
}

/** Bot API `Animation` (GIF / silent video). */
export interface RawAnimation extends RawFileBase {
  width: number;
  height: number;
  duration: number;
  file_name?: string;
  mime_type?: string;
  thumbnail?: RawPhotoSize;
}

/** Bot API `Audio`. */
export interface RawAudio extends RawFileBase {
  duration: number;
  performer?: string;
  title?: string;
  file_name?: string;
  mime_type?: string;
}

/** Bot API `Voice`. */
export interface RawVoice extends RawFileBase {
  duration: number;
  mime_type?: string;
}

/** Bot API `Document`. */
export interface RawDocument extends RawFileBase {
  file_name?: string;
  mime_type?: string;
  thumbnail?: RawPhotoSize;
}

/** Bot API `VideoNote` (round video). */
export interface RawVideoNote extends RawFileBase {
  length: number;
  duration: number;
  thumbnail?: RawPhotoSize;
}

/** Bot API `Sticker`. */
export interface RawSticker extends RawFileBase {
  type: 'regular' | 'mask' | 'custom_emoji';
  width: number;
  height: number;
  is_animated: boolean;
  is_video: boolean;
  emoji?: string;
  set_name?: string;
}

/** Bot API `Dice`. */
export interface RawDice {
  emoji: string;
  value: number;
}

/** Bot API `Location`. */
export interface RawLocation {
  longitude: number;
  latitude: number;
  horizontal_accuracy?: number;
}

/** Bot API `Contact`. */
export interface RawContact {
  phone_number: string;
  first_name: string;
  last_name?: string;
  user_id?: number;
  vcard?: string;
}

/** Bot API `PollOption`. */
export interface RawPollOption {
  text: string;
  voter_count: number;
}

/** Bot API `Poll`. */
export interface RawPoll {
  id: string;
  question: string;
  options: RawPollOption[];
  total_voter_count: number;
  is_closed: boolean;
  is_anonymous: boolean;
  type: 'regular' | 'quiz';
  allows_multiple_answers: boolean;
}

/** Bot API `Venue`. */
export interface RawVenue {
  location: RawLocation;
  title: string;
  address: string;
}

/**
 * Bot API `Message` — the raw wire shape, distinct from the rich `Message` class.
 *
 * `from` is optional per the Bot API (e.g. channel posts have no sender);
 * `chat` is always present on a message. A message carries exactly one content
 * field below (`text` xor a media/`caption` combination, etc.).
 */
export interface RawMessage {
  message_id: number;
  message_thread_id?: number;
  from?: User;
  chat: RawChat;
  date?: number;
  text?: string;
  caption?: string;
  reply_markup?: unknown;
  entities?: RawMessageEntity[];
  caption_entities?: RawMessageEntity[];
  photo?: RawPhotoSize[];
  video?: RawVideo;
  animation?: RawAnimation;
  audio?: RawAudio;
  voice?: RawVoice;
  document?: RawDocument;
  video_note?: RawVideoNote;
  sticker?: RawSticker;
  dice?: RawDice;
  location?: RawLocation;
  contact?: RawContact;
  poll?: RawPoll;
  venue?: RawVenue;
}

/** Bot API `CallbackQuery` — the raw wire shape. */
export interface RawCallbackQuery {
  id: string;
  from: User;
  message?: RawMessage;
  inline_message_id?: string;
  chat_instance: string;
  data?: string;
  game_short_name?: string;
}

/**
 * Bot API `Update` — the raw wire shape.
 *
 * Every field beyond `update_id` is optional; exactly one is present per update.
 * Engine code resolves which one via `resolveKind` (see `lib/context`).
 */
export interface RawUpdate {
  update_id: number;
  message?: RawMessage;
  edited_message?: RawMessage;
  channel_post?: RawMessage;
  edited_channel_post?: RawMessage;
  business_message?: RawMessage;
  edited_business_message?: RawMessage;
  callback_query?: RawCallbackQuery;
}

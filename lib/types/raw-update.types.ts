import { User } from './User';

/**
 * Raw Telegram Bot API payload types — the wire shape, distinct from the rich
 * event classes in `lib/events`.
 *
 * These intentionally do NOT carry the `_updateType` / `_telegramObject`
 * mutation fields of the legacy `lib/types/Update.ts` interface: the new engine
 * wraps the update in a `TelegramExecutionContext` instead of mutating it.
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

/**
 * Bot API `Message` — the raw wire shape (NOT the rich `Message` class).
 *
 * `from` is optional per the Bot API (e.g. channel posts have no sender);
 * `chat` is always present on a message.
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

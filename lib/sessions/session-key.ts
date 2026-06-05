import { TelegramExecutionContext } from '../engine/context';
import { RawMessage } from '../events/raw-update.types';

/**
 * Default session key. A "conversation" is most precisely a user in a chat, so
 * the key scopes by chat AND user — plus the forum topic and business
 * connection when present, so a flow in one topic never bleeds into another
 * (aiogram-style). A callback query is scoped by the topic/connection of the
 * message its button sits on, so inline-button flows share the key of the
 * message flow in that same topic. Parts are slot-prefixed, so an absent middle
 * part can never collide with another. In a 1:1 chat `chat.id === from.id`, so
 * this collapses to a per-user key automatically.
 *
 * Returns `undefined` when there is no chat to scope to (no session that
 * update). Override via `session.key` for a group-shared, global-per-user, or
 * any custom scope.
 */
export function defaultSessionKey(
  ctx: TelegramExecutionContext,
): string | undefined {
  const chatId = ctx.chat?.id;
  if (chatId === undefined) {
    return undefined;
  }

  const parts = [`c${chatId}`];

  const userId = ctx.from?.id;
  if (userId !== undefined) {
    parts.push(`u${userId}`);
  }

  const source = scopeSource(ctx);
  if (source?.message_thread_id !== undefined) {
    parts.push(`t${source.message_thread_id}`);
  }
  if (source?.business_connection_id !== undefined) {
    parts.push(`b${source.business_connection_id}`);
  }

  return parts.join(':');
}

/**
 * The message an update carries (a message kind directly, or the message a
 * callback query's button sits on), narrowed to just the scope fields — both
 * are optional, so an inaccessible callback message contributes nothing.
 */
function scopeSource(
  ctx: TelegramExecutionContext,
): Partial<RawMessage> | undefined {
  const update = ctx.update;
  return (
    update.message ??
    update.edited_message ??
    update.channel_post ??
    update.edited_channel_post ??
    update.business_message ??
    update.edited_business_message ??
    update.callback_query?.message
  );
}

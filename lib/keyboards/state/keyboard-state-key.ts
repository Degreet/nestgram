import { TelegramExecutionContext } from '../../engine/context';
import { KEYBOARD_STATE_KEY_NS } from './keyboard-state.constants';

/**
 * Per-message keyboard-state key: scoped to the exact message a button sits on,
 * so two open pickers (even in one chat) keep independent state. Telegram renders
 * one shared markup per message, so the state is correctly per-message, not
 * per-user — a group keyboard's visible ticks ARE shared, and a private picker is
 * one user one message anyway. In a multi-bot app the bot scopes it outermost.
 *
 * Returns `undefined` for anything but a callback whose message carries an id and
 * chat — the only update that interacts with a rendered keyboard (an inaccessible
 * message still has a stable id, so it keys fine). So a plain message never creates
 * spurious state; the first tap is what brings a keyboard to life.
 */
export function keyboardStateKey(
  ctx: TelegramExecutionContext,
): string | undefined {
  const message = ctx.update.callback_query?.message;
  if (message?.message_id === undefined || message.chat?.id === undefined) {
    return undefined;
  }

  const parts = [KEYBOARD_STATE_KEY_NS];
  if (ctx.bot?.name) {
    parts.push(`n${ctx.bot.name}`);
  }
  parts.push(`c${message.chat.id}`, `m${message.message_id}`);
  return parts.join(':');
}

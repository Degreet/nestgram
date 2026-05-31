import { TelegramExecutionContext } from '../context/telegram-execution-context';
import { User } from '../types/User';
import { RawChat, RawMessage } from '../types/raw-update.types';

/**
 * Pure derivations of cross-cutting values from a wrapped update.
 *
 * Single home for "derive X from the update", shared by the
 * `TelegramExecutionContext` getters and the `NestgramParamsFactory` so the two
 * never drift (DRY).
 */

/** The raw message carried by the update, if its kind has one. */
function messageOf(ctx: TelegramExecutionContext): RawMessage | undefined {
  if (ctx.kind === 'callback_query') {
    return ctx.update.callback_query?.message;
  }

  return ctx.update[ctx.kind] as RawMessage | undefined;
}

/** The user who sent the update (absent for e.g. channel posts). */
export function extractSender(ctx: TelegramExecutionContext): User | undefined {
  if (ctx.kind === 'callback_query') {
    return ctx.update.callback_query?.from;
  }

  return messageOf(ctx)?.from;
}

/** The chat the update happened in (absent for inline-only callback queries). */
export function extractChat(
  ctx: TelegramExecutionContext,
): RawChat | undefined {
  return messageOf(ctx)?.chat;
}

/** The text the update carries (message text, or callback-query data). */
function textOf(ctx: TelegramExecutionContext): string | undefined {
  if (ctx.kind === 'callback_query') {
    return ctx.update.callback_query?.data;
  }

  return messageOf(ctx)?.text;
}

/**
 * Whitespace-split arguments after a command.
 *
 * `'/start a b'` -> `['a', 'b']`; `'/start'` -> `[]`.
 */
export function extractArgs(ctx: TelegramExecutionContext): string[] {
  const text = textOf(ctx);
  if (!text) {
    return [];
  }

  const parts = text.trim().split(/\s+/);
  return parts.slice(1);
}

/**
 * The raw text remainder after a command, unsplit.
 *
 * `'/start ref_123'` -> `'ref_123'`; `'/start'` -> `undefined`.
 */
export function extractPayload(
  ctx: TelegramExecutionContext,
): string | undefined {
  const text = textOf(ctx);
  if (!text) {
    return undefined;
  }

  const firstSpace = text.indexOf(' ');
  if (firstSpace === -1) {
    return undefined;
  }

  return text.slice(firstSpace + 1).trim() || undefined;
}

/** The callback-query data string, when the update is a callback query. */
export function extractCallbackData(
  ctx: TelegramExecutionContext,
): string | undefined {
  return ctx.update.callback_query?.data;
}

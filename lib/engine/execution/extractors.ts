import { TelegramExecutionContext } from '../context/telegram-execution-context';
import { UpdateKind } from '../context/update-kind';
import { User } from '../../events/user';
import { messageEntities } from '../../events/message-entity';
import { RawChat, RawMessage } from '../../events/raw-update.types';

/**
 * Pure derivations of cross-cutting values from a wrapped update.
 *
 * Single home for "derive X from the update", shared by the
 * `TelegramExecutionContext` getters and the `NestgramParamsFactory` so the two
 * never drift (DRY).
 */

/**
 * The `date` of an inaccessible message — the Bot API sets it to `0` so a bot
 * can tell a real message from one it can no longer read (and so cannot edit).
 */
const INACCESSIBLE_MESSAGE_DATE = 0;

/** The raw message carried by the update, if its kind has one. */
function messageOf(ctx: TelegramExecutionContext): RawMessage | undefined {
  if (ctx.kind === UpdateKind.CallbackQuery) {
    return ctx.update.callback_query?.message;
  }

  return ctx.update[ctx.kind] as RawMessage | undefined;
}

/** The user who sent the update (absent for e.g. channel posts). */
export function extractSender(ctx: TelegramExecutionContext): User | undefined {
  if (ctx.kind === UpdateKind.CallbackQuery) {
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

/** Addresses the message an edit-in-place return value targets. */
export interface EditTarget {
  chat_id: number;
  message_id: number;
}

/**
 * The message a callback is attached to — what a bare-keyboard or edit-command
 * return value edits in place. Defined only for a callback query over an
 * accessible message; `undefined` everywhere else — a plain update has no
 * message of the bot's own to edit, and an inaccessible one (too old/deleted)
 * can't be edited — which is the signal to warn instead of making a doomed call.
 */
export function extractEditTarget(
  ctx: TelegramExecutionContext,
): EditTarget | undefined {
  if (ctx.kind !== UpdateKind.CallbackQuery) {
    return undefined;
  }

  const message = messageOf(ctx);
  if (!message || message.date === INACCESSIBLE_MESSAGE_DATE) {
    return undefined;
  }

  return { chat_id: message.chat.id, message_id: message.message_id };
}

/** The text the update carries (message text, or callback-query data). */
function textOf(ctx: TelegramExecutionContext): string | undefined {
  if (ctx.kind === UpdateKind.CallbackQuery) {
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

/** The message's text (a plain-text message), if any. */
export function extractText(ctx: TelegramExecutionContext): string | undefined {
  return messageOf(ctx)?.text;
}

/** The message's media caption, if any. */
export function extractCaption(
  ctx: TelegramExecutionContext,
): string | undefined {
  return messageOf(ctx)?.caption;
}

/** The text of every entity of `type`, from both message text and caption. */
export function extractEntities(
  ctx: TelegramExecutionContext,
  type: string,
): string[] {
  const message = messageOf(ctx);
  if (!message) {
    return [];
  }
  return messageEntities(message, type).map((entity) => entity.text);
}

/** The text of the first entity of `type`, if any. */
export function extractEntity(
  ctx: TelegramExecutionContext,
  type: string,
): string | undefined {
  return extractEntities(ctx, type)[0];
}

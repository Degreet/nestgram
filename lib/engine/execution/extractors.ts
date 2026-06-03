import { TelegramExecutionContext } from '../context/telegram-execution-context';
import { UpdateKind } from '../context/update-kind';
import { User } from '../../events/user';
import {
  RawChat,
  RawMessage,
  RawMessageEntity,
} from '../../events/raw-update.types';

/**
 * Pure derivations of cross-cutting values from a wrapped update.
 *
 * Single home for "derive X from the update", shared by the
 * `TelegramExecutionContext` getters and the `NestgramParamsFactory` so the two
 * never drift (DRY).
 */

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

/** Slice the text of each `type` entity out of its source string. */
function sliceEntities(
  source: string | undefined,
  entities: RawMessageEntity[] | undefined,
  type: string,
): string[] {
  if (!source || !entities) {
    return [];
  }
  // Entity offsets/lengths are UTF-16 code units, matching JS string indices.
  return entities
    .filter((entity) => entity.type === type)
    .map((entity) =>
      source.slice(entity.offset, entity.offset + entity.length),
    );
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
  return [
    ...sliceEntities(message.text, message.entities, type),
    ...sliceEntities(message.caption, message.caption_entities, type),
  ];
}

/** The text of the first entity of `type`, if any. */
export function extractEntity(
  ctx: TelegramExecutionContext,
  type: string,
): string | undefined {
  return extractEntities(ctx, type)[0];
}

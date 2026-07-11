import { Injectable, Logger } from '@nestjs/common';

import { TelegramExecutionContext } from '../context/telegram-execution-context';
import { TelegramEvent } from '../context/event-factory';
import {
  ApiMethod,
  EditMessageMedia,
  EditMessageReplyMarkup,
  EditMessageText,
} from '../../api/methods';
import { InlineKeyboard } from '../../keyboards';
import { ApiException } from '../../exceptions';
import { extractEditTarget, EditTarget } from './extractors';
import type { ReplyOptions } from '../../api';

/** An event that can reply to itself with optional reply options (e.g. `Message.answer`). */
interface Answerable {
  answer(text: string, options?: ReplyOptions): Promise<unknown>;
}

/** The edit-in-place commands that auto-target the current callback message. */
type EditInPlaceMethod =
  | EditMessageText
  | EditMessageReplyMarkup
  | EditMessageMedia;

/**
 * Applies the return-value contract for handlers, after the invoker returns:
 *   - `string`        -> reply that string to the same chat
 *   - `InlineKeyboard`-> edit the current message's markup in place (callback only)
 *   - edit command    -> `new EditMessageText(...)` etc.; its `chat_id`/`message_id`
 *                        are filled from the callback message when omitted
 *   - command object  -> execute it (the pure-data `new SendMessage(...)` layer
 *                        beneath `message.answer(...)` sugar)
 *   - async-iterable  -> stream it to the same chat (private only; else warn+drop)
 *   - anything else   -> noop
 *
 * Editing in place is symmetric to `answer()`: just as a returned string replies
 * to the same chat, a returned keyboard or untargeted edit command acts on the
 * message the callback is attached to — no manual `chat_id`/`message_id` plumbing.
 *
 * Non-string, non-command results are ignored silently — `return message.answer(...)`
 * is idiomatic (especially in arrow handlers) and has already sent the message,
 * so its resolved value is nothing for us to act on, not an error.
 *
 * The optional `options` apply only to the string case — they let a caller
 * (e.g. `ReplyExceptionFilter`) reply with a keyboard or reply target while
 * reusing the same answer/command semantics as a bare handler return.
 */
@Injectable()
export class ResultHandler {
  private readonly logger = new Logger(ResultHandler.name);

  async handle(
    result: unknown,
    ctx: TelegramExecutionContext,
    options?: ReplyOptions,
  ): Promise<void> {
    if (typeof result === 'string') {
      const event = ctx.event;
      if (this.isAnswerable(event)) {
        await event.answer(result, options);
      } else {
        this.logger.warn(
          `Handler for "${ctx.kind}" returned a string but its event has no answer()`,
        );
      }
      return;
    }

    if (result instanceof InlineKeyboard) {
      await this.editMarkupInPlace(result, ctx);
      return;
    }

    if (result instanceof ApiMethod) {
      if (this.isEditInPlace(result) && !this.hasTarget(result)) {
        await this.editCommandInPlace(result, ctx);
        return;
      }
      // The bot that received this update — not a global default — so a returned
      // command object (new SendMessage(...)) goes out through the right bot.
      await ctx.bot.call(result);
      return;
    }

    if (ResultHandler.isStream(result)) {
      await this.streamInPlace(result, ctx);
      return;
    }
  }

  /** A bare keyboard return edits only the current message's reply markup. */
  private async editMarkupInPlace(
    keyboard: InlineKeyboard,
    ctx: TelegramExecutionContext,
  ): Promise<void> {
    const target = extractEditTarget(ctx);
    if (target === undefined) {
      this.logger.warn(
        'Handler returned a keyboard with no message to edit in place — not a ' +
          'callback over an accessible message (a plain update, an old/deleted ' +
          'message, or an inline-message callback). Attach it to a message you ' +
          'send instead, e.g. `message.answer(text, { reply_markup })`.',
      );
      return;
    }

    await this.callEditable(
      new EditMessageReplyMarkup({ ...target, reply_markup: keyboard }),
      ctx,
    );
  }

  /** An untargeted edit command (`new EditMessageText(...)`) targets the callback message. */
  private async editCommandInPlace(
    command: EditInPlaceMethod,
    ctx: TelegramExecutionContext,
  ): Promise<void> {
    const target = extractEditTarget(ctx);
    if (target === undefined) {
      this.logger.warn(
        `Handler returned ${command.method} without a target and there is no ` +
          'editable callback message to fill it from (a plain update, an ' +
          'old/deleted message, or an inline-message callback). Set chat_id/' +
          'message_id — or inline_message_id — on the command explicitly.',
      );
      return;
    }

    await this.callEditable(this.retarget(command, target), ctx);
  }

  // The edit-in-place set must mirror the methods tagged `WRAP_EDITABLE` in
  // tools/codegen/manifest.ts (the ones that edit a message and return
  // `Message | true`). Keep the two in sync: a new editable method added there
  // and meant to auto-target a callback message belongs here too.
  private isEditInPlace(
    method: ApiMethod<unknown, unknown>,
  ): method is EditInPlaceMethod {
    return (
      method instanceof EditMessageText ||
      method instanceof EditMessageReplyMarkup ||
      method instanceof EditMessageMedia
    );
  }

  /** Whether the command already addresses a message — an explicit target wins. */
  private hasTarget(method: EditInPlaceMethod): boolean {
    const payload = method.payload as
      | { chat_id?: unknown; inline_message_id?: unknown }
      | undefined;
    return (
      payload?.chat_id !== undefined || payload?.inline_message_id !== undefined
    );
  }

  /** A copy of the command addressed at `target` (commands stay immutable). */
  private retarget(
    command: EditInPlaceMethod,
    target: EditTarget,
  ): EditInPlaceMethod {
    const Ctor = command.constructor as new (
      payload: object,
    ) => EditInPlaceMethod;
    return new Ctor({ ...command.payload, ...target });
  }

  /**
   * Runs a framework-targeted edit. A stale target (`message can't be edited` /
   * `to edit not found`) is the bot's own message having aged out or been
   * deleted — we warn rather than throw, since the call was our auto-targeting,
   * not an explicit user request. Every other failure propagates unchanged.
   */
  private async callEditable(
    command: ApiMethod<unknown, unknown>,
    ctx: TelegramExecutionContext,
  ): Promise<void> {
    try {
      await ctx.bot.call(command);
    } catch (error) {
      if (ApiException.isNotEditable(error)) {
        this.logger.warn(
          `Could not edit the message in place — ${error.description}. The ` +
            "message may be too old, deleted, or not the bot's own.",
        );
        return;
      }
      throw error;
    }
  }

  /**
   * A returned async-iterable streams to the same chat — the return-value mirror
   * of `message.answerStream(...)`. Streaming's native draft is private-chat
   * only, so a group (or an update with no chat) warns and drops, exactly as a
   * bare string return to a non-answerable event does — the method doors throw
   * for a caller that wants to catch and fall back.
   */
  private async streamInPlace(
    source: AsyncIterable<string>,
    ctx: TelegramExecutionContext,
  ): Promise<void> {
    // A guest message's chat id can misdeliver (see Message.answer) and a guest
    // exchange has no streaming reply, so a returned stream can't be honored —
    // drop it, mirroring the throw `answerStream` gives an imperative caller.
    if (ctx.update.guest_message) {
      this.logger.warn(
        `Handler for "${ctx.kind}" returned a stream for a guest message, which ` +
          "can't be answered by streaming (its chat id may misdeliver). Reply " +
          'with message.answerGuest(result) instead.',
      );
      return;
    }
    const chat = ctx.chat;
    if (chat?.type !== 'private') {
      this.logger.warn(
        `Handler for "${ctx.kind}" returned a stream, but streaming needs a ` +
          'private chat (the native draft is private-chat-only). Use ' +
          'message.answerStream(...) to handle non-private chats explicitly.',
      );
      return;
    }
    await ctx.bot.streamMessage(chat.id, source);
  }

  /**
   * Whether a handler return value is an async-iterable to stream (an LLM token
   * stream, an `async function*`). Structural, like the `typeof === 'string'`
   * check: strings carry `Symbol.iterator`, not `Symbol.asyncIterator`, so they
   * never match here (and are handled by the earlier branch regardless).
   */
  private static isStream(result: unknown): result is AsyncIterable<string> {
    return (
      typeof result === 'object' &&
      result !== null &&
      typeof (result as AsyncIterable<string>)[Symbol.asyncIterator] ===
        'function'
    );
  }

  private isAnswerable(
    event: TelegramEvent,
  ): event is TelegramEvent & Answerable {
    return typeof (event as Answerable).answer === 'function';
  }
}

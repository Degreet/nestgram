import { Logger } from '@nestjs/common';

import { NestgramError } from '../exceptions';
import type { BotService, CallOptions } from '../api';
import type { SendRichMessageOptions } from '../api/methods';
import type { Message } from '../events';
import type { RawInputRichMessage } from '../events/raw-update.types';
import type { RichMessageDialect } from '../builtins/rich-messages/rich-messages.types';
import type { StreamOptions, StreamSource } from './stream.types';

/** The `sendRichMessage` payload minus what the engine fills itself. */
type FinalizeOptions = Partial<
  Omit<SendRichMessageOptions, 'chat_id' | 'rich_message'>
>;

/**
 * Drives one live streamed message: consume a {@link StreamSource} of text
 * deltas, animate a native `sendRichMessageDraft` preview (coalescing to the
 * latest text so rapid tokens never fight the send throttler), then persist the
 * final text with `sendRichMessage`.
 *
 * A per-stream value object — it holds the growing text, its own draft id and
 * the last-pushed snapshot, so it is `new`ed per stream by `bot.streamMessage`,
 * never a DI singleton (which couldn't hold per-stream state). Same shape as the
 * rich events, which hold a `BotService` and are `new`ed per update.
 *
 * Private-chat only — `run()` refuses a non-private chat (Telegram gives private
 * chats positive ids); `sendRichMessageDraft` has no group equivalent.
 */
export class MessageStream {
  private static readonly logger = new Logger(MessageStream.name);

  /**
   * Default minimum gap between animated draft pushes. Matches the send
   * throttler's per-chat cadence, so coalesced pushes arrive as it frees up
   * rather than queuing behind one another.
   */
  private static readonly DEFAULT_THROTTLE_MS = 1000;

  /** The dialect a stream is written in when the caller doesn't pick one. */
  private static readonly DEFAULT_FORMAT: RichMessageDialect = 'markdown';

  /** Draft-id source — each stream animates its own draft (must be non-zero). */
  private static nextDraftId = 1;

  /**
   * Streams currently running in this process **with `canStop`**, keyed by chat
   * AND draft id — how a `stopped_message_generation` update reaches the stream
   * it belongs to.
   *
   * Empty for every bot that never opts in, and it holds at most one entry per
   * concurrent stoppable stream, removed in a `finally`. A bot that doesn't use
   * the feature pays nothing for it.
   *
   * The update arrives through the engine's routing pipeline while the stream is
   * awaiting its source inside a handler; there is no call stack joining them, so
   * they meet through the identifiers Telegram echoes back. In-process by design,
   * like the draft-id counter above: a draft is animated by the one process that
   * is streaming it.
   *
   * The chat is part of the key because `draft_id` is only unique PER CHAT,
   * while the counter above is per process. Two processes behind one webhook
   * both start at 1, so keying on the draft alone would let one user's stop
   * truncate another user's answer. The bot name joins it for the same reason
   * one level up: in a multi-bot app the counter is shared across bots, so
   * without it one bot's stop could end another's stream.
   */
  private static readonly running = new Map<string, MessageStream>();

  private readonly draftId = MessageStream.nextDraftId++;
  private readonly format: RichMessageDialect;
  private readonly throttleMs: number;
  private readonly canStop: boolean;
  private readonly finalizeOptions: FinalizeOptions;
  private readonly callOptions: CallOptions;

  /** The text accumulated so far — every delta appends. */
  private text = '';
  /** The text of the last draft actually pushed — skip a push when unchanged. */
  private pushed = '';
  /** Set when the user pressed stop — the loop breaks at the next delta. */
  private stopped = false;

  constructor(
    private readonly bot: BotService,
    private readonly chatId: number,
    private readonly source: StreamSource,
    options: StreamOptions = {},
  ) {
    const { format, throttleMs, canStop, token, signal, ...finalizeOptions } =
      options;
    this.format = format ?? MessageStream.DEFAULT_FORMAT;
    this.throttleMs = throttleMs ?? MessageStream.DEFAULT_THROTTLE_MS;
    this.canStop = canStop ?? false;
    this.finalizeOptions = finalizeOptions;
    this.callOptions = { token, signal };
  }

  /**
   * Run the stream to completion. Resolves the persisted {@link Message}, or
   * `undefined` when the stream produced no text (nothing to send). A source
   * error — or a failed draft push — aborts: the ephemeral draft expires and the
   * error propagates, so nothing is persisted.
   */
  async run(): Promise<Message | undefined> {
    if (!MessageStream.isPrivateChatId(this.chatId)) {
      throw new NestgramError(
        `streamMessage needs a private chat, but chat_id ${this.chatId} is not ` +
          'one — the native sendRichMessageDraft animation is private-chat-only. ' +
          'Catch this to fall back to a plain send.',
      );
    }
    // Only a stoppable stream is registered. A stream nobody can stop has
    // nothing to look up, so keeping it here would be pure bookkeeping for
    // every author who never asked for the feature.
    if (this.canStop) {
      MessageStream.running.set(this.key, this);
    }
    try {
      let lastPushAt = 0;
      for await (const delta of this.source) {
        // Checked before appending: text the user stopped before seeing is text
        // they asked not to receive. `break` runs the source's `finally`.
        if (this.stopped) {
          break;
        }
        this.text += delta;
        // Gate on real new content so a leading empty / duplicate chunk (LLM
        // streams often open with an empty delta) doesn't spend the throttle
        // window and suppress the first visible frame.
        if (
          this.text !== this.pushed &&
          Date.now() - lastPushAt >= this.throttleMs
        ) {
          await this.pushDraft();
          lastPushAt = Date.now();
        }
      }
    } finally {
      // Unconditional: `delete` on an absent key is a no-op, and a guard here
      // would have to stay in sync with the one above forever.
      MessageStream.running.delete(this.key);
    }
    return this.finalize();
  }

  /**
   * End the stream `botName` is running behind `draftId` in `chatId`. Returns
   * whether one matched — false for a draft this process never started, or one
   * that already finished (the press raced the last token).
   */
  static stop(botName: string, chatId: number, draftId: number): boolean {
    const stream = MessageStream.running.get(
      MessageStream.keyOf(botName, chatId, draftId),
    );
    if (stream === undefined) {
      return false;
    }
    stream.stopped = true;
    return true;
  }

  /** Separates the parts of a registry key; never valid inside a bot name. */
  private static readonly KEY_SEPARATOR = ':';

  /** This stream's registry key. */
  private get key(): string {
    return MessageStream.keyOf(this.bot.name, this.chatId, this.draftId);
  }

  private static keyOf(
    botName: string,
    chatId: number,
    draftId: number,
  ): string {
    return [botName, chatId, draftId].join(MessageStream.KEY_SEPARATOR);
  }

  /**
   * Push the latest accumulated text as an animated draft frame. The caller
   * (`run`) gates this on real new content, so it always has a frame to send.
   */
  private async pushDraft(): Promise<void> {
    const snapshot = this.text;
    await this.bot.sendRichMessageDraft(
      this.chatId,
      this.draftId,
      this.fmt(snapshot),
      {
        ...this.callOptions,
        // `keep_on_stop` rides with `can_stop`: it holds the partial on screen
        // for the moment between the press and `finalize()` sending the real
        // message, instead of blanking and re-appearing.
        ...(this.canStop && { can_stop: true, keep_on_stop: true }),
      },
    );
    this.pushed = snapshot;
  }

  /** Persist the full text as a real message — or nothing for an empty stream. */
  private async finalize(): Promise<Message | undefined> {
    if (this.text === '') {
      MessageStream.logger.debug('Stream produced no text — nothing sent.');
      return undefined;
    }
    return this.bot.sendRichMessage(this.chatId, this.fmt(this.text), {
      ...this.finalizeOptions,
      ...this.callOptions,
    });
  }

  /** Wrap the accumulated text as the dialect's `InputRichMessage` field. */
  private fmt(text: string): RawInputRichMessage {
    return this.format === 'html' ? { html: text } : { markdown: text };
  }

  /**
   * Whether a chat id addresses a private (one-to-one) chat. Telegram gives
   * users and private chats positive ids; groups, supergroups and channels are
   * negative. The native draft is private-only, so `run()` gates on this.
   */
  private static isPrivateChatId(id: number): boolean {
    return id > 0;
  }
}

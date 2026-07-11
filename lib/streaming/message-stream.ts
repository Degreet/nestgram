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

  private readonly draftId = MessageStream.nextDraftId++;
  private readonly format: RichMessageDialect;
  private readonly throttleMs: number;
  private readonly finalizeOptions: FinalizeOptions;
  private readonly callOptions: CallOptions;

  /** The text accumulated so far — every delta appends. */
  private text = '';
  /** The text of the last draft actually pushed — skip a push when unchanged. */
  private pushed = '';

  constructor(
    private readonly bot: BotService,
    private readonly chatId: number,
    private readonly source: StreamSource,
    options: StreamOptions = {},
  ) {
    const { format, throttleMs, token, signal, ...finalizeOptions } = options;
    this.format = format ?? MessageStream.DEFAULT_FORMAT;
    this.throttleMs = throttleMs ?? MessageStream.DEFAULT_THROTTLE_MS;
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
    let lastPushAt = 0;
    for await (const delta of this.source) {
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
    return this.finalize();
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
      this.callOptions,
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

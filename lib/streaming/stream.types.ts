import type { MethodOptions } from '../api';
import type { SendRichMessageOptions } from '../api/methods';
import type { RichMessageDialect } from '../builtins/rich-messages/rich-messages.types';

/**
 * The text a stream consumes: an async iterable of *deltas* that concatenate
 * into the growing message — an LLM token stream, an `async function*`, anything
 * `for await`-able. Each yield appends (it is not a full replacement), so the
 * engine accumulates them and the final message is the whole concatenation.
 */
export type StreamSource = AsyncIterable<string>;

/**
 * Options for a streamed message: the `sendRichMessage` finalize options (reply
 * target, keyboard, notification, `token`/`signal`…) plus the two streaming
 * knobs. The finalize options apply to the persisted message, not the animated
 * draft frames.
 */
export interface StreamOptions
  extends MethodOptions<
    Omit<SendRichMessageOptions, 'chat_id' | 'rich_message'>
  > {
  /** Rich dialect the streamed text is written in. Defaults to `'markdown'`. */
  format?: RichMessageDialect;
  /**
   * Minimum milliseconds between animated draft pushes. The engine coalesces
   * deltas and pushes at most this often, so rapid tokens never flood — or queue
   * behind — the send throttler. Defaults to ~1s.
   */
  throttleMs?: number;
  /**
   * Show the user a stop button on the animated draft. Pressing it ends the
   * stream: the framework stops consuming the source (which runs an async
   * generator's `finally`, so a well-written source cancels its own work) and
   * persists whatever text arrived, since Telegram discards the draft itself.
   *
   * Off by default — a stream the user cannot interrupt is the old behaviour,
   * and turning it on changes what a handler's source sees.
   */
  canStop?: boolean;
}

import { NestgramError } from './nestgram.error';
import { ApiMethod } from '../api/methods';
import type { MethodOptions } from '../api';
import type { SendMessageOptions } from '../api/methods';
import type { AnswerCallbackQueryOptions } from '../api/methods';

/**
 * The reply a {@link ReplyException} carries: either a string to send to the
 * same chat, or a ready-made command object (the pure-data `new SendMessage(...)`
 * layer beneath `message.answer(...)`). Mirrors a handler's return-value
 * contract exactly, so the reaction is identical to `return content`.
 */
export type ReplyContent = string | ApiMethod<unknown, unknown>;

/** Reply options applied when {@link ReplyException} carries a plain string. */
export type ReplyOptions = MethodOptions<SendMessageOptions>;

/**
 * Throw to short-circuit the pipeline (from a guard, pipe, interceptor, or the
 * handler itself) and reply to the originating chat — the Telegram counterpart
 * of Nest's `throw new HttpException(...)`. A built-in global `@Catch` filter
 * (`ReplyExceptionFilter`) maps it to the reply; no privileged core, so a bot
 * author could register the same filter themselves.
 *
 * ```ts
 * throw new ReplyException('Only admins can do that.');
 * throw new ReplyException('Saved!', { reply_markup: keyboard });
 * throw new ReplyException(new SendMessage({ chat_id, text: 'Done.' }));
 * ```
 *
 * Disable the built-in handling with `replyExceptions: false` — the exception
 * then propagates like any other error (logged by the dispatcher).
 */
export class ReplyException extends NestgramError {
  readonly name: string = 'ReplyException';

  /** The text/command to reply with. */
  readonly content: ReplyContent;

  /** Reply options, used only when {@link content} is a string. */
  readonly options?: ReplyOptions;

  constructor(content: ReplyContent, options?: ReplyOptions) {
    super(
      typeof content === 'string' ? content : ReplyException.COMMAND_MESSAGE,
    );
    this.content = content;
    this.options = options;
  }

  /** `Error.message` text used when the reply is a command object, not a string. */
  private static readonly COMMAND_MESSAGE = 'ReplyException with a command';
}

/**
 * Throw to answer the originating callback query with a toast or modal alert —
 * the callback-only counterpart of {@link ReplyException}. A subclass so a single
 * `@Catch(ReplyException)` filter covers both; on a non-callback update it has no
 * effect (the filter logs a warning).
 *
 * ```ts
 * throw new AnswerException('Too fast — slow down.');
 * throw new AnswerException('Not allowed', { show_alert: true });
 * ```
 */
export class AnswerException extends ReplyException {
  readonly name: string = 'AnswerException';

  /** The toast/alert text to show on the callback button. */
  readonly text: string;

  /** Options for the callback answer (e.g. `show_alert`). */
  readonly answerOptions?: MethodOptions<AnswerCallbackQueryOptions>;

  constructor(
    text: string,
    answerOptions?: MethodOptions<AnswerCallbackQueryOptions>,
  ) {
    super(text);
    this.text = text;
    this.answerOptions = answerOptions;
  }
}

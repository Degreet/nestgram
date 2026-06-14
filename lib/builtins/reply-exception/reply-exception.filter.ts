import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  Inject,
  Injectable,
  Logger,
} from '@nestjs/common';

import { TelegramExecutionContext, UpdateKind } from '../../engine/context';
import { ResultHandler } from '../../engine/execution';
import { AnswerException, ReplyException } from '../../exceptions';
import { Providers } from '../../providers';
import type { CallbackQuery } from '../../events';
import type { NestgramModuleOptions } from '../../module/nestgram-module.types';

/**
 * Maps a thrown {@link ReplyException}/{@link AnswerException} to a Telegram
 * reply — the framework's `HttpException -> filter` idiom. Throw one from a
 * guard, pipe, interceptor, or handler and this global `@Catch` filter sends the
 * reaction; the original control-flow exception is consumed, so the dispatcher
 * sees a clean completion (no error log).
 *
 * A plain Nest exception filter (registered globally by `NestgramModule` as an
 * `APP_FILTER`) that self-disables when `replyExceptions` is `false` — exactly
 * the kind a bot author could write, proving the "no privileged core" principle.
 * When off it re-throws, so the exception propagates to the dispatcher's normal
 * logging path, just as if the feature didn't exist.
 */
@Injectable()
@Catch(ReplyException)
export class ReplyExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ReplyExceptionFilter.name);

  constructor(
    private readonly resultHandler: ResultHandler,
    @Inject(Providers.NESTGRAM_OPTIONS)
    private readonly options: NestgramModuleOptions,
  ) {}

  async catch(exception: ReplyException, host: ArgumentsHost): Promise<void> {
    if (this.options.replyExceptions === false) {
      // Self-disabled: let it flow to the dispatcher's catch like any other error.
      throw exception;
    }

    const ctx = TelegramExecutionContext.of(host);

    try {
      await this.react(exception, ctx);
    } catch (sendError) {
      // A failed reaction must not become an unhandled rejection nor re-surface
      // the original control-flow exception (already consumed) — log and stop.
      this.logger.warn(
        `Failed to send reply for ${exception.name}: ${sendError}`,
      );
    }
  }

  /** Resolve the exception to its Telegram reaction and dispatch it. */
  private async react(
    exception: ReplyException,
    ctx: TelegramExecutionContext,
  ): Promise<void> {
    if (exception instanceof AnswerException) {
      await this.answerCallback(exception, ctx);
      return;
    }

    // String (with or without options) or a command object — the handler
    // return-value contract exactly. Reuse ResultHandler so reply/command
    // semantics (and the can't-answer warning) stay in one place.
    await this.resultHandler.handle(exception.content, ctx, exception.options);
  }

  /** Answer the originating callback query (toast/alert). Callback-only. */
  private async answerCallback(
    exception: AnswerException,
    ctx: TelegramExecutionContext,
  ): Promise<void> {
    if (ctx.kind !== UpdateKind.CallbackQuery) {
      this.logger.warn(
        `AnswerException thrown on "${ctx.kind}", but answering is callback-only — ignored`,
      );
      return;
    }

    // An AnswerException always carries a string (its constructor takes `text`).
    const event = ctx.event as CallbackQuery;
    await event.answer(exception.text, exception.answerOptions);
  }
}

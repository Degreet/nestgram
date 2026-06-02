import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { TelegramExecutionContext, UpdateKind } from '../engine/context';
import { Metadata } from '../decorators/metadata.enum';
import { Providers } from '../providers';
import type { CallbackQuery } from '../events';
import type { NestgramModuleOptions } from '../module/nestgram-module.types';

/**
 * Answers a callback query the handler left unanswered, so the button never
 * spins. A plain Nest interceptor (registered globally by `NestgramModule` when
 * `autoAnswerCallbackQueries` isn't `false`) — exactly the kind a bot author
 * could write, proving the "no privileged core" principle.
 *
 * Only fires on success: a thrown error skips the `tap` and is left to the
 * exception filter. A handler that already called `query.answer()`, or one
 * marked `@NoAutoAnswer()`, is left alone.
 */
@Injectable()
export class AutoAnswerCallbackInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AutoAnswerCallbackInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    @Inject(Providers.NESTGRAM_OPTIONS)
    private readonly options: NestgramModuleOptions,
  ) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (this.options.autoAnswerCallbackQueries === false) {
      return next.handle();
    }

    const ctx = TelegramExecutionContext.of(context);
    if (ctx.kind !== UpdateKind.CallbackQuery) {
      return next.handle();
    }

    const optedOut = this.reflector.get<boolean>(
      Metadata.NO_AUTO_ANSWER,
      context.getHandler(),
    );
    if (optedOut) {
      return next.handle();
    }

    const query = ctx.event as CallbackQuery;
    return next.handle().pipe(
      tap(() => {
        if (!query.answered) {
          // Fire-and-forget, but never let a rejected auto-answer (e.g. "query
          // too old") become an unhandled rejection that noises up the process.
          query
            .answer()
            .catch((error) => this.logger.warn(`Auto-answer failed: ${error}`));
        }
      }),
    );
  }
}

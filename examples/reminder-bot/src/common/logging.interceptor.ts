import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { TelegramExecutionContext } from 'nestgram';
import { Observable, tap } from 'rxjs';

/**
 * A plain Nest interceptor — proof that the standard pipeline works on a
 * Telegram update exactly as on an HTTP request. Applied per router via
 * `@UseInterceptors`, so it only wraps Telegram handlers (it reads the update
 * via `TelegramExecutionContext.of`, which is meaningful only there).
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('Update');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const ctx = TelegramExecutionContext.of(context);
    const who = ctx.from ? `@${ctx.from.username ?? ctx.from.id}` : 'unknown';
    const startedAt = Date.now();

    this.logger.log(`${ctx.type} from ${who}`);
    return next
      .handle()
      .pipe(
        tap(() =>
          this.logger.log(`${ctx.type} handled in ${Date.now() - startedAt}ms`),
        ),
      );
  }
}

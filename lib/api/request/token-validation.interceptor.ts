import { Inject, Injectable, Logger } from '@nestjs/common';
import type { Observable } from 'rxjs';

import {
  ApiCallHandler,
  ApiExecutionContext,
  ApiInterceptor,
} from './api-interceptor.types';
import { Providers } from '../../providers';
import { BotOptions } from '../bot-options';
import { NestgramConfigError } from '../../exceptions';

/**
 * Validates the bot token where it is actually used — as an
 * {@link ApiInterceptor}, so the check can't be bypassed by going through
 * `BotService` directly (every outbound call funnels through the pipeline).
 *
 * Its constructor validates the CONFIGURED token once at boot (fail fast on a
 * missing one; warn if it doesn't look like a Telegram token). `intercept` then
 * guards every request's token — catching an empty per-call override — without
 * re-warning each call. A synchronous throw here is turned into a rejected
 * Promise by the pipeline's `defer`, so the caller still catches it.
 */
@Injectable()
export class TokenValidationInterceptor implements ApiInterceptor {
  private readonly logger = new Logger(TokenValidationInterceptor.name);

  /** Telegram bot tokens look like `123456789:AA...` (id colon secret). */
  private static readonly TOKEN_PATTERN = /^\d+:[\w-]+$/;

  constructor(@Inject(Providers.BOT_OPTIONS) options: BotOptions) {
    this.requireToken(options.token);
    if (!TokenValidationInterceptor.TOKEN_PATTERN.test(options.token)) {
      this.logger.warn(
        'Bot token does not look like a Telegram token (expected "<id>:<secret>").',
      );
    }
  }

  intercept(
    context: ApiExecutionContext,
    next: ApiCallHandler,
  ): Observable<unknown> {
    this.requireToken(context.getRequest().token);
    return next.handle();
  }

  private requireToken(token: string): void {
    if (typeof token !== 'string' || token.trim() === '') {
      throw new NestgramConfigError(
        'A bot token is required — pass it to NestgramModule.forRoot({ token }).',
      );
    }
  }
}

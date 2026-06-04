import { Inject, Injectable, Logger } from '@nestjs/common';

import { ApiRequest, RequestTransformer } from './request.types';
import { Providers } from '../../providers';
import { BotOptions } from '../bot-options';
import { NestgramConfigError } from '../../exceptions';

/**
 * Validates the bot token where it is actually used — as a
 * {@link RequestTransformer}, so the check can't be bypassed by going through
 * `BotService` directly (every outbound request funnels through the pipeline).
 *
 * Its constructor validates the CONFIGURED token once at boot (fail fast on a
 * missing one; warn if it doesn't look like a Telegram token). `transform` then
 * guards every request's token — catching an empty per-call override — without
 * re-warning each call, so there is no per-token state to keep.
 */
@Injectable()
export class TokenValidationTransformer implements RequestTransformer {
  private readonly logger = new Logger(TokenValidationTransformer.name);

  /** Telegram bot tokens look like `123456789:AA...` (id colon secret). */
  private static readonly TOKEN_PATTERN = /^\d+:[\w-]+$/;

  constructor(@Inject(Providers.BOT_OPTIONS) options: BotOptions) {
    this.requireToken(options.token);
    if (!TokenValidationTransformer.TOKEN_PATTERN.test(options.token)) {
      this.logger.warn(
        'Bot token does not look like a Telegram token (expected "<id>:<secret>").',
      );
    }
  }

  transform(request: ApiRequest): void {
    this.requireToken(request.token);
  }

  private requireToken(token: string): void {
    if (typeof token !== 'string' || token.trim() === '') {
      throw new NestgramConfigError(
        'A bot token is required — pass it to NestgramModule.forRoot({ token }).',
      );
    }
  }
}

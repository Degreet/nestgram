import { Inject, Logger } from '@nestjs/common';

import { Router } from '../../decorators/injectable/router.decorator';
import { OnUnhandled } from '../../decorators/listeners/on-unhandled.decorator';
import { NoAutoAnswer } from '../../decorators/no-auto-answer.decorator';
import { Providers } from '../../providers';
import type { RawUpdate } from '../../events/raw-update.types';
import type { NestgramModuleOptions } from '../../module/nestgram-module.types';

/**
 * Ships the dead-button warning as a default `@OnUnhandled` handler — public,
 * and a user could have written it (no privileged core). When a `callback_query`
 * matches no `@Action` route the button is dead (pressing does nothing), so warn
 * in development.
 *
 * `@NoAutoAnswer` keeps it from changing behavior: it only logs, never silences
 * the spinner, so a dead button looks the same as before — just diagnosed.
 * Disable with `warnUnhandledCallbacks: false`; add your own `@OnUnhandled` for
 * custom handling of unmatched updates.
 */
@Router()
export class DeadButtonWarner {
  private readonly logger = new Logger('CallbackRoute');

  constructor(
    @Inject(Providers.NESTGRAM_OPTIONS)
    private readonly options: NestgramModuleOptions,
  ) {}

  @OnUnhandled()
  @NoAutoAnswer()
  warn(update: RawUpdate): void {
    if (this.options.warnUnhandledCallbacks === false) {
      return;
    }
    const data = update.callback_query?.data;
    if (data !== undefined) {
      this.logger.warn(
        `Button callback_data "${data}" matched no @Action route — pressing ` +
          `it does nothing. Check the route string against its handler.`,
      );
    }
  }
}

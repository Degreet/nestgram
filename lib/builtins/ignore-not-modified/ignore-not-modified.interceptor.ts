import { Inject, Injectable } from '@nestjs/common';
import { catchError, of, throwError, type Observable } from 'rxjs';

import { ApiException } from '../../exceptions/api.exception';
import {
  ApiCallHandler,
  ApiExecutionContext,
  ApiInterceptor,
} from '../../api/request';
import { Providers } from '../../providers';

/** The slice of BotOptions this interceptor reads. */
interface IgnoreNotModifiedConfig {
  ignoreNotModified?: boolean;
}

/**
 * Swallows Telegram's `400 message is not modified` on edits — the no-op a bot
 * hits when a callback button is tapped twice and the edit re-sends identical
 * content. Opt-in via `ignoreNotModified: true`; off by default, because
 * silently eating API errors is otherwise a footgun.
 *
 * It swallows ONLY "not modified". A genuinely stale edit (`message can't be
 * edited` / `message to edit not found`, e.g. a callback on an old message)
 * still throws — hiding that would mask a real bug. On a swallow it emits
 * `true`, the `Message | true` success-without-update that `editMessage*`
 * already models, so the caller sees a normal no-op result.
 *
 * An ordinary {@link ApiInterceptor} — no privileged core; a user could write
 * the same hook with {@link ApiException.isNotModified}.
 */
@Injectable()
export class IgnoreNotModifiedInterceptor implements ApiInterceptor {
  private readonly enabled: boolean;

  constructor(@Inject(Providers.BOT_OPTIONS) options: IgnoreNotModifiedConfig) {
    this.enabled = options.ignoreNotModified === true;
  }

  intercept(
    _context: ApiExecutionContext,
    next: ApiCallHandler,
  ): Observable<unknown> {
    if (!this.enabled) {
      return next.handle();
    }
    // `not modified` is edit-exclusive in the Bot API, and every edit method
    // returns `Message | true` — so emitting `true` for the swallowed error is
    // always a valid result for the call that produced it (no method check
    // needed).
    return next
      .handle()
      .pipe(
        catchError((error: unknown) =>
          ApiException.isNotModified(error)
            ? of(true)
            : throwError(() => error),
        ),
      );
  }
}

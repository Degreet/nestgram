import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';

import { ApiCaptureStore } from './api-capture.store';

/**
 * Records handler errors so a test can assert a handler threw.
 *
 * Without this, a throwing handler is invisible: the real {@link UpdateDispatcher}
 * try/catches every error and only logs it (correct for production — one bad
 * update mustn't kill polling), so the test sees an empty `sent` —
 * indistinguishable from a guard block or a no-match.
 *
 * Registered as a global `APP_FILTER`, this filter sits in the same Nest pipeline
 * the handler runs through (via `ExternalContextCreator`), so a thrown error
 * reaches it BEFORE the dispatcher's catch. It records the error to the capture
 * store and then RE-THROWS it, so the error keeps flowing exactly as in
 * production: the dispatcher's own try/catch logs it and skips the post-handler
 * stage `commit` (sessions stay unpersisted on a thrown handler). Recording
 * before re-throwing is the only added behaviour — control flow is unchanged.
 *
 * The testbed reads {@link ApiCaptureStore.lastError} afterwards for assertions
 * and, only when `{ rethrow: true }`, re-surfaces it to the caller.
 */
@Catch()
export class CaptureErrorFilter implements ExceptionFilter {
  constructor(private readonly store: ApiCaptureStore) {}

  catch(exception: unknown, _host: ArgumentsHost): never {
    this.store.recordError(exception);
    throw exception;
  }
}

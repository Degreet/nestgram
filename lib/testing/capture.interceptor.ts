import { Injectable } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { from, type Observable } from 'rxjs';

import { BotService } from '../api/bot.service';
import {
  ApiCallHandler,
  ApiExecutionContext,
  ApiInterceptor,
} from '../api/request';
import { ApiCaptureStore } from './api-capture.store';

/**
 * Captures every outgoing Bot API call instead of sending it — the seam that
 * makes {@link NestgramTestbed} network-free.
 *
 * Registered as the LAST entry of a bot's `apiInterceptors`, so it sits just
 * above the throttler and the wire call: the built-in mutators (default
 * parse-mode, rich-messages, …) have already run, so the request it records is
 * exactly what would have gone out. It then short-circuits — it never calls
 * `next.handle()`, so neither the throttler nor `fetch` runs — and emits the
 * stubbed result through the method's own `wrap()`, so a handler that awaits the
 * send still gets a real rich object (`Message`, `User`, …).
 *
 * `ModuleRef` resolves the `BotService` lazily at call time (not in the
 * constructor) to break the obvious cycle: the bot is built FROM the pipeline this
 * interceptor lives in.
 */
@Injectable()
export class CaptureInterceptor implements ApiInterceptor {
  constructor(
    private readonly store: ApiCaptureStore,
    private readonly moduleRef: ModuleRef,
  ) {}

  intercept<T>(
    context: ApiExecutionContext,
    _next: ApiCallHandler<T>,
  ): Observable<T> {
    return from(this.captureAndStub<T>(context));
  }

  private async captureAndStub<T>(context: ApiExecutionContext): Promise<T> {
    const raw = await this.store.capture(context.getRequest());
    const method = context.getMethod();
    if (!method.wrap) {
      return raw as T;
    }
    const bot = this.moduleRef.get(BotService, { strict: false });
    return method.wrap(raw, bot) as T;
  }
}

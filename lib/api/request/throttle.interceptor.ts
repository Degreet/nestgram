import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Optional,
} from '@nestjs/common';
import { defer, from, lastValueFrom, type Observable } from 'rxjs';

import { ApiException } from '../../exceptions/api.exception';
import { Providers } from '../../providers';
import {
  ApiCallHandler,
  ApiExecutionContext,
  ApiInterceptor,
} from './api-interceptor.types';
import { ChatLimiterRegistry } from './chat-limiter-registry';
import { Clock, CLOCK, SystemClock } from './clock';
import { TokenBucket } from './limiters';
import {
  ResolvedThrottleOptions,
  resolveThrottleOptions,
  ThrottleOptions,
} from './throttle.types';

/** The slice of BotOptions this interceptor reads (like DefaultParseModeInterceptor). */
interface ThrottleConfigSource {
  throttle?: boolean | ThrottleOptions;
}

/**
 * Send throttler as an {@link ApiInterceptor}: a global token bucket plus
 * per-chat limiters, with a bounded, scope-aware 429 retry. It is just one
 * public interceptor — a user can replace it (`throttler: MyInterceptor`),
 * disable it (`throttle: false` → it passes through), or reorder it. No
 * privileged core.
 *
 * The RxJS seam is thin: `intercept` exposes the proven imperative gate+retry
 * (`run`/`withRetry`, Clock-injected for deterministic tests) through
 * `defer(() => from(this.run(...)))`. The gate/limiter state stays imperative —
 * a token bucket is mutable state, not a stream.
 *
 * In-process only: each instance/replica has its own budget, so N replicas can
 * still collectively exceed Telegram's limits. Distributed throttling is a
 * swap-in via this same interface (ROADMAP Phase 4).
 */
@Injectable()
export class ThrottleInterceptor
  implements ApiInterceptor, OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly enabled: boolean;
  private readonly options: ResolvedThrottleOptions;
  private readonly global: TokenBucket;
  private readonly chats: ChatLimiterRegistry;
  private sweeper?: ReturnType<typeof setInterval>;

  constructor(
    @Inject(Providers.BOT_OPTIONS) options: ThrottleConfigSource,
    @Optional()
    @Inject(CLOCK)
    private readonly clock: Clock = new SystemClock(),
  ) {
    // `throttle: false` makes this a passthrough — the toggle works uniformly for
    // forRoot and forRootAsync (where the value is only known after the factory).
    this.enabled = options.throttle !== false;
    this.options = resolveThrottleOptions(options.throttle);
    this.global = new TokenBucket(
      this.options.globalRate,
      this.options.globalRate,
      this.options.globalIntervalMs,
      this.clock,
    );
    this.chats = new ChatLimiterRegistry(this.options, this.clock);
  }

  intercept<T>(
    context: ApiExecutionContext,
    next: ApiCallHandler<T>,
  ): Observable<T> {
    // Reads (`get*`, incl. long-poll getUpdates) and webhook admin don't count
    // against send limits — pass straight through so they neither burn the
    // global budget nor stall behind a send-side 429 backoff.
    if (!this.enabled || context.getMethod().throttled === false) {
      return next.handle();
    }
    // chat_id is read here, after the outer mutating interceptors have run.
    const chatId = context.getRequest().payload.chat_id as
      | number
      | string
      | undefined;
    const signal = context.getSignal();
    // Cold: each subscription re-runs run(); withRetry re-invokes the send
    // closure, which re-subscribes next.handle() (re-fetch) per attempt.
    return defer(() =>
      from(this.run(chatId, signal, () => lastValueFrom(next.handle()))),
    );
  }

  /** Start the one shared, unref'd idle-eviction sweeper (only in a live app). */
  onApplicationBootstrap(): void {
    if (!this.enabled) {
      return;
    }
    this.sweeper = setInterval(
      () => this.chats.sweep(),
      this.options.sweepIntervalMs,
    );
    this.sweeper.unref?.();
  }

  onApplicationShutdown(): void {
    if (this.sweeper) {
      clearInterval(this.sweeper);
    }
  }

  async run<R>(
    chatId: number | string | undefined,
    signal: AbortSignal | undefined,
    send: () => Promise<R>,
  ): Promise<R> {
    if (!this.enabled) {
      return send();
    }
    // Per-chat before global, so a chat-limited send doesn't burn a global token
    // it can't yet use.
    if (chatId !== undefined) {
      await this.chats.acquire(chatId, signal);
    }
    await this.global.acquire(signal);
    return this.withRetry(chatId, signal, send);
  }

  private async withRetry<R>(
    chatId: number | string | undefined,
    signal: AbortSignal | undefined,
    send: () => Promise<R>,
  ): Promise<R> {
    for (let attempt = 0; ; attempt += 1) {
      try {
        return await send();
      } catch (error) {
        if (
          !this.options.retry ||
          !this.isRateLimit(error) ||
          attempt >= this.options.maxRetries
        ) {
          throw error;
        }
        const waitMs =
          (error.parameters?.retry_after ?? this.options.fallbackRetrySeconds) *
            1000 +
          this.options.retryBufferMs;
        // Pause the limited scope so other queued sends also back off for the
        // window — global pauses the whole bot, chat/absent only that chat.
        if (error.parameters?.scope === 'global') {
          this.global.pause(waitMs);
        } else if (chatId !== undefined) {
          this.chats.pause(chatId, waitMs);
        }
        await this.clock.sleep(waitMs, signal);
      }
    }
  }

  private isRateLimit(error: unknown): error is ApiException {
    return error instanceof ApiException && error.error_code === 429;
  }
}

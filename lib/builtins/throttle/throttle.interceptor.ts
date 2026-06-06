import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { defer, from, lastValueFrom, type Observable } from 'rxjs';

import { ApiException } from '../../exceptions/api.exception';
import {
  ApiCallHandler,
  ApiExecutionContext,
  ApiInterceptor,
} from '../../api/request';
import { ChatLimiterRegistry } from './chat-limiter-registry';
import { Clock, CLOCK } from './clock';
import { TokenBucket } from './limiters';
import {
  GLOBAL_TOKEN_BUCKET,
  ResolvedThrottleOptions,
  ThrottleSettings,
  THROTTLE_SETTINGS,
} from './throttle.types';

/**
 * Send throttler as an {@link ApiInterceptor}: a global token bucket plus
 * per-chat limiters, with a bounded, scope-aware 429 retry. It is just one
 * public interceptor — a user can replace it (`throttler: MyInterceptor`),
 * disable it (`throttle: false` → it passes through), or reorder it. No
 * privileged core.
 *
 * The RxJS seam is thin: `intercept` exposes the proven imperative gate+retry
 * (`run`/`withRetry`) through `defer(() => from(this.run(...)))`. The
 * gate/limiter state stays imperative — a token bucket is mutable state, not a
 * stream.
 *
 * It receives its collaborators (settings, the global bucket, the per-chat
 * registry, the clock) ready-built — the composition lives in {@link
 * ThrottleModule}, not this constructor.
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
  private sweeper?: ReturnType<typeof setInterval>;

  /** Non-`get*` methods that still don't count against send limits (admin). */
  private static readonly UNTHROTTLED_ADMIN: ReadonlySet<string> = new Set([
    'setWebhook',
    'deleteWebhook',
    'logOut',
    'close',
  ]);

  constructor(
    @Inject(THROTTLE_SETTINGS) settings: ThrottleSettings,
    @Inject(GLOBAL_TOKEN_BUCKET) private readonly global: TokenBucket,
    private readonly chats: ChatLimiterRegistry,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {
    this.enabled = settings.enabled;
    this.options = settings.options;
  }

  intercept<T>(
    context: ApiExecutionContext,
    next: ApiCallHandler<T>,
  ): Observable<T> {
    // Reads (`get*`, incl. long-poll getUpdates) and webhook admin don't count
    // against send limits — pass straight through so they neither burn the
    // global budget nor stall behind a send-side 429 backoff. The throttler owns
    // this policy (not a flag on every method), so it's swappable with the rest.
    if (!this.enabled || !this.isThrottled(context.getMethod().method)) {
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

  /**
   * Whether a method counts against Telegram's send rate limits. Reads (`get*`,
   * long-poll `getUpdates` above all) and webhook/session admin don't — routing
   * them through the throttler would burn the global budget and couple polling to
   * a send-side 429 backoff. Living here (not as a flag on every method class)
   * keeps the policy with the one component that owns it.
   */
  private isThrottled(method: string): boolean {
    return (
      !method.startsWith('get') &&
      !ThrottleInterceptor.UNTHROTTLED_ADMIN.has(method)
    );
  }
}

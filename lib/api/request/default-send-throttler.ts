import {
  Inject,
  Injectable,
  OnApplicationBootstrap,
  OnApplicationShutdown,
  Optional,
} from '@nestjs/common';

import { ApiException } from '../../exceptions/api.exception';
import { Providers } from '../../providers';
import { ChatLimiterRegistry } from './chat-limiter-registry';
import { Clock, CLOCK, SystemClock } from './clock';
import { TokenBucket } from './limiters';
import {
  ResolvedThrottleOptions,
  resolveThrottleOptions,
  SendThrottler,
  ThrottleOptions,
} from './throttle.types';

/** The slice of BotOptions this throttler reads (like DefaultParseModeTransformer). */
interface ThrottleConfigSource {
  throttle?: boolean | ThrottleOptions;
}

/**
 * Default send throttler: a global token bucket plus per-chat limiters, with a
 * bounded, scope-aware 429 retry. It is just the public `SendThrottler` — a user
 * can replace it (`throttler: MyThrottler`) or disable it (`throttle: false` →
 * NoopThrottler), no privileged core.
 *
 * In-process only: each instance/replica has its own budget, so N replicas can
 * still collectively exceed Telegram's limits. Distributed throttling is a
 * swap-in via this same interface (ROADMAP Phase 4).
 */
@Injectable()
export class DefaultSendThrottler
  implements SendThrottler, OnApplicationBootstrap, OnApplicationShutdown
{
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
    this.options = resolveThrottleOptions(options.throttle);
    this.global = new TokenBucket(
      this.options.globalRate,
      this.options.globalRate,
      this.options.globalIntervalMs,
      this.clock,
    );
    this.chats = new ChatLimiterRegistry(this.options, this.clock);
  }

  /** Start the one shared, unref'd idle-eviction sweeper (only in a live app). */
  onApplicationBootstrap(): void {
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

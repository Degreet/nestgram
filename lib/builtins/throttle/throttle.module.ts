import { Module, Provider } from '@nestjs/common';

import { Providers } from '../../providers';
import { ChatLimiterRegistry } from './chat-limiter-registry';
import { Clock, CLOCK, SystemClock } from './clock';
import { TokenBucket } from './limiters';
import { ThrottleInterceptor } from './throttle.interceptor';
import {
  GLOBAL_TOKEN_BUCKET,
  resolveThrottleOptions,
  ThrottleOptions,
  ThrottleSettings,
  THROTTLE_SETTINGS,
} from './throttle.types';

/** The slice of BotOptions the settings factory reads. */
interface ThrottleConfigSource {
  throttle?: boolean | ThrottleOptions;
}

/**
 * The throttle feature's providers — settings resolved from `BotOptions`, the
 * shared bucket + per-chat registry parameterised by them and the clock, and the
 * interceptor. A hoisted function (callable from the `@Module` decorator below)
 * so the SAME provider set can be spliced directly into a per-bot module: there
 * each resolves THAT bot's `BOT_OPTIONS`, giving every bot its own throttle state
 * — which an imported module couldn't do, as it would resolve a global token.
 * `CLOCK` defaults to `SystemClock`; re-provide the token to override (e.g. a
 * `FakeClock` in tests).
 */
export function throttleProviders(): Provider[] {
  return [
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: THROTTLE_SETTINGS,
      useFactory: (options: ThrottleConfigSource): ThrottleSettings => ({
        // `throttle: false` makes the interceptor a passthrough — resolved here
        // so it works uniformly for forRoot and forRootAsync.
        enabled: options.throttle !== false,
        options: resolveThrottleOptions(options.throttle),
      }),
      inject: [Providers.BOT_OPTIONS],
    },
    {
      provide: GLOBAL_TOKEN_BUCKET,
      useFactory: (settings: ThrottleSettings, clock: Clock): TokenBucket =>
        new TokenBucket(
          settings.options.globalRate,
          settings.options.globalRate,
          settings.options.globalIntervalMs,
          clock,
        ),
      inject: [THROTTLE_SETTINGS, CLOCK],
    },
    {
      provide: ChatLimiterRegistry,
      useFactory: (
        settings: ThrottleSettings,
        clock: Clock,
      ): ChatLimiterRegistry =>
        new ChatLimiterRegistry(settings.options, clock),
      inject: [THROTTLE_SETTINGS, CLOCK],
    },
    ThrottleInterceptor,
  ];
}

/**
 * The throttle composition root as a standalone module (kept for back-compat and
 * direct import). `BotModule` no longer imports it — it splices
 * {@link throttleProviders} into each per-bot module so the settings resolve that
 * bot's options — but the module stays public.
 */
@Module({
  providers: throttleProviders(),
  exports: [ThrottleInterceptor],
})
export class ThrottleModule {}

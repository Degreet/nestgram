import { Module } from '@nestjs/common';

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
 * Wires the throttle feature. This module is the composition root: it resolves
 * the settings from `BotOptions`, builds the shared global bucket and per-chat
 * registry (parameterised by those settings + the clock), and exposes the
 * interceptor. The {@link ThrottleInterceptor} therefore receives ready
 * collaborators and assembles nothing itself.
 *
 * A plain provider-grouping module (no `forRoot`): `BotModule` imports it and
 * places the exported interceptor in its ordered pipeline, so interceptor order
 * stays owned by `BotModule`, not scattered. `CLOCK` defaults to `SystemClock`
 * and can be overridden (e.g. a `FakeClock` in tests) by re-providing the token.
 */
@Module({
  providers: [
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
  ],
  exports: [ThrottleInterceptor],
})
export class ThrottleModule {}

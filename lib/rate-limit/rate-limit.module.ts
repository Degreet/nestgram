import {
  DynamicModule,
  Module,
  ModuleMetadata,
  Provider,
} from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';

import { CLOCK, SystemClock } from '../builtins/throttle/clock';
import { MemoryStore, type KeyValueStore } from '../store/key-value-store';
import { RateLimitInterceptor } from './rate-limit.interceptor';
import {
  RateLimitOptions,
  RATE_LIMIT_OPTIONS,
  RATE_LIMIT_STORE,
} from './rate-limit.types';
import { RateLimiter } from './rate-limiter';

/**
 * Options for `RateLimitModule.forRootAsync` — resolve the store/key/defaults
 * from DI (e.g. a Redis store built from `ConfigService`) instead of passing
 * them literally.
 */
export interface RateLimitModuleAsyncOptions
  extends Pick<ModuleMetadata, 'imports'> {
  inject?: any[];
  useFactory: (...args: any[]) => Promise<RateLimitOptions> | RateLimitOptions;
}

/**
 * Enables inbound rate-limiting (flood control). Import it once alongside
 * `NestgramModule` — `RateLimitModule.forRoot({ default: { limit, windowMs } })`
 * — to drop updates from a user/chat that exceeds the limit. Per-route control
 * via `@RateLimit(...)` / `@SkipRateLimit()`.
 *
 * Self-contained, no privileged core: it registers a single public
 * `APP_INTERCEPTOR` ({@link RateLimitInterceptor}) a user could have written.
 * Omit the module to keep rate-limiting off entirely.
 */
@Module({})
export class RateLimitModule {
  private static readonly providers: Provider[] = [
    // The limiter's own in-scope clock, so it never depends on the throttle
    // feature's CLOCK provider being present. Tests drive time by constructing
    // a RateLimiter directly with a fake clock (see rate-limiter.spec.ts).
    { provide: CLOCK, useClass: SystemClock },
    RateLimiter,
    { provide: APP_INTERCEPTOR, useClass: RateLimitInterceptor },
  ];

  static forRoot(options: RateLimitOptions = {}): DynamicModule {
    return {
      module: RateLimitModule,
      global: true,
      providers: [
        { provide: RATE_LIMIT_OPTIONS, useValue: options },
        {
          provide: RATE_LIMIT_STORE,
          useFactory: (resolved: RateLimitOptions) =>
            RateLimitModule.resolveStore(resolved),
          inject: [RATE_LIMIT_OPTIONS],
        },
        ...this.providers,
      ],
    };
  }

  static forRootAsync(options: RateLimitModuleAsyncOptions): DynamicModule {
    return {
      module: RateLimitModule,
      global: true,
      imports: options.imports ?? [],
      providers: [
        {
          provide: RATE_LIMIT_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
        {
          provide: RATE_LIMIT_STORE,
          useFactory: (resolved: RateLimitOptions) =>
            RateLimitModule.resolveStore(resolved),
          inject: [RATE_LIMIT_OPTIONS],
        },
        ...this.providers,
      ],
    };
  }

  /**
   * The configured store, or a default {@link MemoryStore}. The default carries
   * no time-based TTL: per-route windows are unknown here, and a TTL shorter
   * than a rule's window would evict a live counter and let a flood through.
   * The {@link RateLimiter}'s lazy prune bounds each entry's size; supply a
   * Redis-backed store with a native TTL to evict idle keys at scale.
   */
  private static resolveStore(options: RateLimitOptions): KeyValueStore {
    return options.store ?? new MemoryStore();
  }
}

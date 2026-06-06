import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';

import { BotService } from './bot.service';

import { BotAsyncOptions, BotOptions } from './bot-options';
import { NestgramConfigError } from '../exceptions';
import { Providers } from '../providers';
import {
  API_INTERCEPTORS,
  ApiInterceptor,
  ApiPipeline,
  DefaultParseModeInterceptor,
  ThrottleInterceptor,
  TokenValidationInterceptor,
} from './request';

@Global()
@Module({})
export class BotModule {
  /**
   * Providers for the outbound API interceptor pipeline. `API_INTERCEPTORS` is
   * the ordered array `ApiPipeline` composes into a Nest-style onion, outermost
   * first: token validation (its constructor also fail-fasts on a missing
   * configured token at boot), default parse-mode, any user-supplied
   * interceptors, then the throttler innermost (closest to the wire, so it reads
   * `chat_id` after the mutators). The built-ins are ordinary `ApiInterceptor`s —
   * no privileged core; a user can add, reorder, or replace them.
   *
   * Built as an explicit array via `useFactory`, not a `multi`-provider token:
   * Nest has no generic `multi: true` aggregation (a `multi` token collapses to a
   * single, last-wins instance — `APP_*` enhancers are special-cased separately),
   * so the factory injects every interceptor and returns them as the array.
   *
   * The throttle slot uses `throttler ?? ThrottleInterceptor` — a user swaps the
   * rate-limiter with one key (e.g. a Redis-backed distributed one); the default
   * self-disables on `throttle: false`.
   */
  private static interceptorProviders(
    userInterceptors: Type<ApiInterceptor>[],
    throttler: Type<ApiInterceptor> | undefined,
  ): Provider[] {
    const ordered: Type<ApiInterceptor>[] = [
      TokenValidationInterceptor,
      DefaultParseModeInterceptor,
      ...userInterceptors,
      throttler ?? ThrottleInterceptor,
    ];
    return [
      ...ordered,
      {
        provide: API_INTERCEPTORS,
        useFactory: (...interceptors: ApiInterceptor[]): ApiInterceptor[] =>
          interceptors,
        inject: ordered,
      },
      ApiPipeline,
    ];
  }

  static forRoot(options: BotOptions): DynamicModule {
    return {
      module: BotModule,
      providers: [
        {
          provide: Providers.BOT_OPTIONS,
          useValue: options,
        },
        ...this.interceptorProviders(
          options.apiInterceptors ?? [],
          options.throttler,
        ),
        {
          provide: BotService,
          useClass: BotService,
        },
      ],
      exports: [Providers.BOT_OPTIONS, BotService],
    };
  }

  static forRootAsync(options: BotAsyncOptions): DynamicModule {
    return {
      module: BotModule,
      imports: options.imports ?? [],
      providers: [
        ...this.createAsyncProviders(options),
        ...this.interceptorProviders(
          options.apiInterceptors ?? [],
          options.throttler,
        ),
        {
          provide: BotService,
          useClass: BotService,
        },
      ],
      exports: [Providers.BOT_OPTIONS, BotService],
    };
  }

  private static createAsyncProviders(options: BotAsyncOptions): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: Providers.BOT_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ];
    }

    const optionsClass = options.useClass ?? options.useExisting;
    if (!optionsClass) {
      throw new NestgramConfigError(
        'BotModule.forRootAsync requires one of useFactory, useClass or useExisting',
      );
    }

    const providers: Provider[] = [
      {
        provide: Providers.BOT_OPTIONS,
        useFactory: async (factory: BotOptions) => factory,
        inject: [optionsClass],
      },
    ];

    if (options.useClass) {
      providers.push({ provide: options.useClass, useClass: options.useClass });
    }

    return providers;
  }
}

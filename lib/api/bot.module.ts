import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';

import { BotService } from './bot.service';

import { BotAsyncOptions, BotOptions } from './bot-options';
import { NestgramConfigError } from '../exceptions';
import { Providers } from '../providers';
import { API_INTERCEPTORS, ApiInterceptor, ApiPipeline } from './request';
// Import the send built-ins by feature subpath, not the '../builtins' barrel:
// the barrel also re-exports the handler-side auto-answer interceptor, which
// would drag the engine/module graph into the api layer (and cycle).
import { DefaultParseModeInterceptor } from '../builtins/parse-mode';
import { RichMessagesInterceptor } from '../builtins/rich-messages';
import { ThrottleInterceptor, ThrottleModule } from '../builtins/throttle';
import { TokenValidationInterceptor } from '../builtins/token-validation';

@Global()
@Module({})
export class BotModule {
  /**
   * Providers for the outbound API interceptor pipeline. `API_INTERCEPTORS` is
   * the ordered array `ApiPipeline` composes into a Nest-style onion, outermost
   * first: token validation (its constructor also fail-fasts on a missing
   * configured token at boot), rich-messages rewrite (before parse-mode, so an
   * injected default `parse_mode` can't read as explicit formatting intent;
   * inert unless `RichMessagesModule.forRoot` provided its settings), default
   * parse-mode, any user-supplied interceptors, then the throttler innermost
   * (closest to the wire, so it reads `chat_id` after the mutators). The
   * built-ins are ordinary `ApiInterceptor`s — no privileged core; a user can
   * add, reorder, or replace them.
   *
   * Built as an explicit array via `useFactory`, not a `multi`-provider token:
   * Nest has no generic `multi: true` aggregation (a `multi` token collapses to a
   * single, last-wins instance — `APP_*` enhancers are special-cased separately),
   * so the factory injects every interceptor and returns them as the array.
   *
   * The throttle slot is `throttler ?? ThrottleInterceptor` — a user swaps the
   * rate-limiter with one key (e.g. a Redis-backed distributed one); the default
   * self-disables on `throttle: false`. The default `ThrottleInterceptor` is
   * provided (with its collaborators) by the imported {@link ThrottleModule}, so
   * only a custom throttler is provided here.
   */
  private static interceptorProviders(
    userInterceptors: Type<ApiInterceptor>[],
    throttler: Type<ApiInterceptor> | undefined,
  ): Provider[] {
    // One source of truth for the leading interceptors, reused for both the
    // provider list and the factory's inject list so they can't drift.
    const leading: Type<ApiInterceptor>[] = [
      TokenValidationInterceptor,
      RichMessagesInterceptor,
      DefaultParseModeInterceptor,
      ...userInterceptors,
    ];
    const throttleSlot = throttler ?? ThrottleInterceptor;
    return [
      ...leading,
      // The default ThrottleInterceptor comes from the imported ThrottleModule;
      // only a custom throttler is provided here.
      ...(throttler ? [throttler] : []),
      {
        provide: API_INTERCEPTORS,
        useFactory: (...interceptors: ApiInterceptor[]): ApiInterceptor[] =>
          interceptors,
        inject: [...leading, throttleSlot],
      },
      ApiPipeline,
    ];
  }

  /**
   * The default throttler lives in {@link ThrottleModule} (its composition root),
   * so import it unless the user swapped in their own `throttler` (which brings
   * its own wiring).
   */
  private static throttleImports(
    throttler: Type<ApiInterceptor> | undefined,
  ): NonNullable<DynamicModule['imports']> {
    return throttler ? [] : [ThrottleModule];
  }

  static forRoot(options: BotOptions): DynamicModule {
    return {
      module: BotModule,
      imports: this.throttleImports(options.throttler),
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
      imports: [
        ...(options.imports ?? []),
        ...this.throttleImports(options.throttler),
      ],
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

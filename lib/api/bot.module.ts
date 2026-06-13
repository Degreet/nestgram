import { DynamicModule, Module, Provider, Type } from '@nestjs/common';

import { BotService } from './bot.service';

import { BotAsyncOptions, BotOptions } from './bot-options';
import { NestgramConfigError } from '../exceptions';
import { getBotToken, Providers } from '../providers';
import { API_INTERCEPTORS, ApiInterceptor, ApiPipeline } from './request';
// Import the send built-ins by feature subpath, not the '../builtins' barrel:
// the barrel also re-exports the handler-side auto-answer interceptor, which
// would drag the engine/module graph into the api layer (and cycle).
import { DefaultParseModeInterceptor } from '../builtins/parse-mode';
import { IgnoreNotModifiedInterceptor } from '../builtins/ignore-not-modified';
import {
  RICH_MESSAGES_SETTINGS,
  RichMessagesInterceptor,
  RichMessagesSettings,
  resolveRichMessagesSettings,
} from '../builtins/rich-messages';
import { ThrottleInterceptor, throttleProviders } from '../builtins/throttle';
import { TokenValidationInterceptor } from '../builtins/token-validation';

/**
 * Builds ONE bot — its own `BotService` reachable under `getBotToken(name)`, on
 * its own interceptor pipeline. A static factory (not an `@Module` itself):
 * `NestgramModule` calls `forBot` once per configured bot, so multiple bots each
 * get an ISOLATED pipeline. The isolation comes from giving every bot its own
 * generated module class with a PRIVATE `BOT_OPTIONS` — the interceptors and the
 * spliced throttle providers resolve THAT bot's options, so `parseMode`,
 * `throttle`, etc. are per-bot and each bot has its own throttle state. Only the
 * `getBotToken(name)` provider is exported (globally); the pipeline stays private.
 */
export class BotModule {
  /**
   * The outbound API interceptor pipeline for one bot. `API_INTERCEPTORS` is the
   * ordered array `ApiPipeline` composes into a Nest-style onion, outermost
   * first: token validation, ignore-not-modified, rich-messages rewrite (before
   * parse-mode, so an injected default `parse_mode` can't read as explicit
   * formatting intent), default parse-mode, any user interceptors, then the
   * throttler innermost. Built as an explicit array via `useFactory` — Nest has
   * no generic `multi: true` aggregation (a `multi` token collapses to a single,
   * last-wins instance), so the factory injects every interceptor and returns the
   * array. The default throttler's collaborators are spliced in via
   * {@link throttleProviders} (resolving this bot's `BOT_OPTIONS`); a custom
   * `throttler` replaces them.
   */
  private static pipelineProviders(
    userInterceptors: Type<ApiInterceptor>[],
    throttler: Type<ApiInterceptor> | undefined,
  ): Provider[] {
    // One source of truth for the leading interceptors, reused for both the
    // provider list and the factory's inject list so they can't drift.
    const leading: Type<ApiInterceptor>[] = [
      TokenValidationInterceptor,
      IgnoreNotModifiedInterceptor,
      RichMessagesInterceptor,
      DefaultParseModeInterceptor,
      ...userInterceptors,
    ];
    const throttleSlot = throttler ?? ThrottleInterceptor;
    return [
      ...leading,
      // Resolved from the `richMessages` option (or `null` when omitted) — the
      // RichMessagesInterceptor reads this and stays a passthrough when null.
      {
        provide: RICH_MESSAGES_SETTINGS,
        useFactory: (options: BotOptions): RichMessagesSettings | null =>
          resolveRichMessagesSettings(options.richMessages),
        inject: [Providers.BOT_OPTIONS],
      },
      // The default throttler's providers are spliced (not imported) so they
      // resolve THIS bot's BOT_OPTIONS; a custom throttler replaces them.
      ...(throttler ? [throttler] : throttleProviders()),
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
   * A fresh module class per bot, so two bots are distinct Nest modules with
   * separate provider scopes (rather than one class re-imported, which Nest may
   * dedupe — collapsing the per-bot `BOT_OPTIONS`). Marked `global` via the
   * DynamicModule so the exported `getBotToken` is app-wide for `@InjectBot`.
   */
  private static moduleClass(): Type {
    class NestgramBotModule {}
    Module({})(NestgramBotModule);
    return NestgramBotModule;
  }

  static forBot(name: string, options: BotOptions): DynamicModule {
    return {
      module: this.moduleClass(),
      global: true,
      providers: [
        { provide: Providers.BOT_OPTIONS, useValue: options },
        ...this.pipelineProviders(
          options.apiInterceptors ?? [],
          options.throttler,
        ),
        { provide: getBotToken(name), useClass: BotService },
      ],
      exports: [getBotToken(name)],
    };
  }

  static forBotAsync(name: string, options: BotAsyncOptions): DynamicModule {
    return {
      module: this.moduleClass(),
      global: true,
      imports: options.imports ?? [],
      providers: [
        ...this.createAsyncProviders(options),
        ...this.pipelineProviders(
          options.apiInterceptors ?? [],
          options.throttler,
        ),
        { provide: getBotToken(name), useClass: BotService },
      ],
      exports: [getBotToken(name)],
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
        'BotModule.forBotAsync requires one of useFactory, useClass or useExisting',
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

import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR, DiscoveryModule } from '@nestjs/core';

import { BotModule } from '../api';
import { BotOptions } from '../api/bot-options';
import { BotConfigResolver } from './bot-config';
import { ContextFactory, EventFactory } from '../engine/context';
import { RouteExplorer, RouteMatcher, RouteTable } from '../engine/discovery';
import { NestgramConfigError } from '../exceptions';
import { Providers } from '../providers';
import { HandlerExecutorFactory, ResultHandler } from '../engine/execution';
import {
  StageExplorer,
  StageRegistry,
  UpdateDispatcher,
} from '../engine/dispatcher';
import {
  AllowedUpdatesResolver,
  PollingUpdateSource,
  UpdateSource,
  WebhookUpdateSource,
} from '../engine/source';
import { AutoAnswerCallbackInterceptor } from '../builtins/auto-answer';
import { NestgramBootstrap } from './nestgram.bootstrap';
import {
  NestgramModuleAsyncOptions,
  NestgramModuleOptions,
  NestgramOptionsFactory,
} from './nestgram-module.types';

/**
 * The framework entry point. `forRoot`/`forRootAsync` configure the bot (token,
 * transport) and register the engine providers; routers are discovered, not
 * listed.
 *
 * Imports Nest's `DiscoveryModule` (so `DiscoveryService`/`MetadataScanner` are
 * injectable for route discovery) and `BotModule` (for `BotService`). Handler
 * execution uses Nest's `ExternalContextCreator`, resolved from the core
 * internals — no need to provide it here.
 *
 * `BotModule` stays internal: bot authors only ever touch `NestgramModule`,
 * which owns option resolution and feeds the token down.
 */
@Global()
@Module({})
export class NestgramModule {
  /** Engine providers — identical for the sync and async entry points. */
  private static readonly engineProviders: Provider[] = [
    EventFactory,
    ContextFactory,
    RouteExplorer,
    RouteTable,
    RouteMatcher,
    HandlerExecutorFactory,
    ResultHandler,
    // The dispatcher runs per-update stages discovered + ordered at boot. The
    // stages themselves live in their own modules a user imports — i18n in
    // I18nModule, sessions in SessionModule — so nothing here is privileged; a
    // user adds their own with @UpdateStage.
    StageExplorer,
    StageRegistry,
    UpdateDispatcher,
    AllowedUpdatesResolver,
    PollingUpdateSource,
    WebhookUpdateSource,
    // The active transport, chosen by config: webhook if configured, else
    // polling. Bootstrap injects UPDATE_SOURCE and only starts it when a
    // transport is set.
    {
      provide: Providers.UPDATE_SOURCE,
      useFactory: (
        options: NestgramModuleOptions,
        polling: PollingUpdateSource,
        webhook: WebhookUpdateSource,
      ): UpdateSource => (options.webhook ? webhook : polling),
      inject: [
        Providers.NESTGRAM_OPTIONS,
        PollingUpdateSource,
        WebhookUpdateSource,
      ],
    },
    NestgramBootstrap,
    // Built-ins as ordinary public providers (no privileged core). Auto-answer
    // is a global interceptor that self-disables when the option is off, so it
    // stays uniform across forRoot / forRootAsync.
    { provide: APP_INTERCEPTOR, useClass: AutoAnswerCallbackInterceptor },
  ];

  /**
   * `NESTGRAM_OPTIONS` is exported so the (internal) `BotModule` can inject it
   * in the async path to read the resolved token. `WebhookUpdateSource` is
   * exported so a webhook controller the author registers in their own module
   * (the ready-made one or a custom one) can inject it to verify + deliver.
   */
  private static readonly engineExports = [
    UpdateDispatcher,
    RouteTable,
    WebhookUpdateSource,
    Providers.NESTGRAM_OPTIONS,
  ];

  /**
   * Normalize the config and take the single bot's options. Multi-bot wiring
   * (one BotService + source per bot) is in progress on the `feature/multi-bot`
   * branch — until it lands, a `bots: []` with more than one entry is rejected
   * here, while the single-bot path runs entirely through the same resolver.
   */
  private static resolveSingleBot(options: NestgramModuleOptions): BotOptions {
    const [bot, ...more] = BotConfigResolver.resolve(options);
    if (more.length > 0) {
      throw new NestgramConfigError(
        'Multiple bots are configured, but multi-bot wiring is still in ' +
          'progress on this build — use a single `token` for now.',
      );
    }
    return bot.options;
  }

  static forRoot(options: NestgramModuleOptions): DynamicModule {
    return {
      module: NestgramModule,
      imports: [
        BotModule.forRoot(NestgramModule.resolveSingleBot(options)),
        DiscoveryModule,
      ],
      // No controllers: the webhook receiver isn't auto-registered. The author
      // adds `WebhookController` (or their own) to a module's `controllers` — see
      // the WebhookOptions docs.
      providers: [
        { provide: Providers.NESTGRAM_OPTIONS, useValue: options },
        ...this.engineProviders,
      ],
      exports: this.engineExports,
    };
  }

  static forRootAsync(options: NestgramModuleAsyncOptions): DynamicModule {
    return {
      module: NestgramModule,
      imports: [
        ...(options.imports ?? []),
        BotModule.forRootAsync({
          inject: [Providers.NESTGRAM_OPTIONS],
          useFactory: (resolved: NestgramModuleOptions) =>
            NestgramModule.resolveSingleBot(resolved),
          // Static (a class can't resolve through the value factory) — like apiInterceptors.
          apiInterceptors: options.apiInterceptors,
          throttler: options.throttler,
        }),
        DiscoveryModule,
      ],
      // No controllers: same as forRoot — the author registers the webhook
      // receiver themselves. Uniform across sync/async (the async config never
      // had to be known here to wire a route).
      providers: [
        ...this.createAsyncOptionsProviders(options),
        ...this.engineProviders,
      ],
      exports: this.engineExports,
    };
  }

  /** Resolve `NESTGRAM_OPTIONS` from a factory / class / existing provider. */
  private static createAsyncOptionsProviders(
    options: NestgramModuleAsyncOptions,
  ): Provider[] {
    if (options.useFactory) {
      return [
        {
          provide: Providers.NESTGRAM_OPTIONS,
          useFactory: options.useFactory,
          inject: options.inject ?? [],
        },
      ];
    }

    const optionsFactory = options.useClass ?? options.useExisting;
    if (!optionsFactory) {
      throw new NestgramConfigError(
        'NestgramModule.forRootAsync requires one of useFactory, useClass or useExisting',
      );
    }

    const providers: Provider[] = [
      {
        provide: Providers.NESTGRAM_OPTIONS,
        useFactory: (factory: NestgramOptionsFactory) =>
          factory.createNestgramOptions(),
        inject: [optionsFactory],
      },
    ];

    if (options.useClass) {
      providers.push({ provide: options.useClass, useClass: options.useClass });
    }

    return providers;
  }
}

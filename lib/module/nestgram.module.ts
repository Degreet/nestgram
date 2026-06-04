import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { APP_INTERCEPTOR, DiscoveryModule } from '@nestjs/core';

import { BotModule } from '../api';
import { ContextFactory, EventFactory } from '../engine/context';
import { RouteExplorer, RouteMatcher, RouteTable } from '../engine/discovery';
import { NestgramConfigError } from '../exceptions';
import { Providers } from '../providers';
import { HandlerExecutorFactory, ResultHandler } from '../engine/execution';
import { UpdateDispatcher } from '../engine/dispatcher';
import {
  PollingUpdateSource,
  UpdateSource,
  WebhookController,
  WebhookUpdateSource,
} from '../engine/source';
import { AutoAnswerCallbackInterceptor } from '../interceptors';
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
    UpdateDispatcher,
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
   * in the async path to read the resolved token.
   */
  private static readonly engineExports = [
    UpdateDispatcher,
    RouteTable,
    Providers.NESTGRAM_OPTIONS,
  ];

  static forRoot(options: NestgramModuleOptions): DynamicModule {
    return {
      module: NestgramModule,
      imports: [
        BotModule.forRoot({
          token: options.token,
          parseMode: options.parseMode,
          transformers: options.transformers,
        }),
        DiscoveryModule,
      ],
      // The webhook receiver. Registered only when webhook is configured here
      // (it's inert otherwise); it serves on an HTTP app, ignored otherwise.
      controllers: options.webhook ? [WebhookController] : [],
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
          useFactory: (resolved: NestgramModuleOptions) => ({
            token: resolved.token,
            parseMode: resolved.parseMode,
          }),
          transformers: options.transformers,
        }),
        DiscoveryModule,
      ],
      // Webhook config is resolved asynchronously, so it isn't known here;
      // always register the receiver (inert unless webhook is configured).
      controllers: [WebhookController],
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

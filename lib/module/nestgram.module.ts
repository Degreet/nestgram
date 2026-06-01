import { DynamicModule, Global, Module, Provider } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { BotModule } from '../bot';
import { ContextFactory, EventFactory } from '../context';
import { RouteExplorer, RouteMatcher, RouteTable } from '../discovery';
import { Providers } from '../enums';
import { HandlerExecutorFactory, ResultHandler } from '../execution';
import { UpdateDispatcher } from '../runtime';
import { NestgramBootstrap } from './nestgram.bootstrap';
import {
  NestgramModuleAsyncOptions,
  NestgramModuleOptions,
  NestgramOptionsFactory,
} from './nestgram-module.types';

/** Engine providers — identical for the sync and async entry points. */
const ENGINE_PROVIDERS: Provider[] = [
  EventFactory,
  ContextFactory,
  RouteExplorer,
  RouteTable,
  RouteMatcher,
  HandlerExecutorFactory,
  ResultHandler,
  UpdateDispatcher,
  NestgramBootstrap,
];

/**
 * `NESTGRAM_OPTIONS` is exported so the (internal) `BotModule` can inject it in
 * the async path to read the resolved token.
 */
const ENGINE_EXPORTS = [
  UpdateDispatcher,
  RouteTable,
  Providers.NESTGRAM_OPTIONS,
];

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
  static forRoot(options: NestgramModuleOptions): DynamicModule {
    return {
      module: NestgramModule,
      imports: [BotModule.forRoot({ token: options.token }), DiscoveryModule],
      providers: [
        { provide: Providers.NESTGRAM_OPTIONS, useValue: options },
        ...ENGINE_PROVIDERS,
      ],
      exports: ENGINE_EXPORTS,
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
          }),
        }),
        DiscoveryModule,
      ],
      providers: [
        ...this.createAsyncOptionsProviders(options),
        ...ENGINE_PROVIDERS,
      ],
      exports: ENGINE_EXPORTS,
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
      throw new Error(
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

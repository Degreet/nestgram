import { DynamicModule, Global, Module } from '@nestjs/common';
import { DiscoveryModule } from '@nestjs/core';

import { BotModule } from '../bot';
import { ContextFactory, EventFactory } from '../context';
import { RouteExplorer, RouteTable } from '../discovery';
import { Providers } from '../enums';
import { HandlerExecutorFactory, ResultHandler } from '../execution';
import { UpdateDispatcher } from '../runtime';
import { NestgramBootstrap } from './nestgram.bootstrap';
import { NestgramModuleOptions } from './nestgram-module.types';

/**
 * The framework entry point. `forRoot` configures the bot (token, transport)
 * and registers the engine providers; routers are discovered, not listed.
 *
 * Imports Nest's `DiscoveryModule` (so `DiscoveryService`/`MetadataScanner` are
 * injectable for route discovery) and `BotModule` (for `BotService`). Handler
 * execution uses Nest's `ExternalContextCreator`, which is injectable from the
 * core internals — no need to provide it here.
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
        EventFactory,
        ContextFactory,
        RouteExplorer,
        RouteTable,
        HandlerExecutorFactory,
        ResultHandler,
        UpdateDispatcher,
        NestgramBootstrap,
      ],
      exports: [UpdateDispatcher, RouteTable],
    };
  }
}

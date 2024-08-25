import { DynamicModule, Global, Module, Provider } from '@nestjs/common';

import { DispatcherService } from './dispatcher.service';
import { MiddlewareService } from './middleware.service';
import { HandlerService } from './handler.service';

import { BotModule } from '../bot';
import { Providers } from '../enums';
import { DispatcherOptions } from '../types';
import { usedFilters } from '../decorators';

import {
  createDependentProvider,
  createRouterProviders,
} from './dispatcher.provider';

@Global()
@Module({
  imports: [BotModule],
  providers: [DispatcherService, MiddlewareService, HandlerService],
})
export class DispatcherModule {
  public static forRoot(options: DispatcherOptions): DynamicModule {
    const providers: Provider[] = [
      {
        provide: Providers.DISPATCHER_OPTIONS,
        useValue: options,
      },
      ...createRouterProviders(options.routers ?? []),
      ...options.outerMiddlewares?.map(createDependentProvider),
      ...usedFilters.map(createDependentProvider),
    ];

    return {
      module: DispatcherModule,
      providers,
      exports: [Providers.DISPATCHER_OPTIONS, DispatcherService],
    };
  }
}

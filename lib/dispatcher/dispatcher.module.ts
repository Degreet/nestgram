import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';

import { DispatcherService } from './dispatcher.service';
import { MiddlewareService } from './middleware.service';
import { HandlerService } from './handler.service';

import { BotModule } from '../bot';
import { Metadata, Providers } from '../enums';

import { DispatcherOptions } from '../types';
import { AppliedRouterOptions, RouterOptions } from '../decorators';

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
    ];

    const toProvide = [
      ...this.exploreRouters(options.routers ?? []),
      ...(options?.outerMiddlewares ?? []),
    ];

    toProvide.forEach((useClass) => {
      providers.push({
        provide: useClass,
        useClass,
      });
    });

    return {
      module: DispatcherModule,
      providers,
      exports: [Providers.DISPATCHER_OPTIONS, DispatcherService],
    };
  }

  private static exploreRouters(routers: Type[], parent?: Type): Type[] {
    const explored: any[] = [];

    routers.forEach((router) => {
      explored.push(router);

      const metadata: RouterOptions = Reflect.getMetadata(
        Metadata.ROUTER,
        router,
      );
      if (parent) {
        const newMetadata: AppliedRouterOptions = { ...metadata, parent };
        Reflect.defineMetadata(Metadata.ROUTER, newMetadata, router);
      }
      if (metadata?.middlewares) {
        explored.push(...metadata.middlewares);
      }
      if (metadata?.includes) {
        explored.push(...this.exploreRouters(metadata?.includes, router));
      }
    });

    return explored;
  }
}

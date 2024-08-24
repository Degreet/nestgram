import { DynamicModule, Global, Module, Provider, Type } from '@nestjs/common';

import { DispatcherService } from './dispatcher.service';
import { MiddlewareService } from './middleware.service';

import { BotModule } from '../bot';
import { Metadata, Providers } from '../enums';

import { DispatcherOptions } from '../types/DispatcherOptions';
import { RouterOptions } from '../decorators';

@Global()
@Module({
  imports: [BotModule],
  providers: [DispatcherService, MiddlewareService],
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
      exports: [Providers.DISPATCHER_OPTIONS],
    };
  }

  private static exploreRouters(routers?: Type[]): Type[] {
    const explored: any[] = [];

    routers.forEach((router) => {
      explored.push(router);
      const metadata: RouterOptions = Reflect.getMetadata(
        Metadata.ROUTER,
        router,
      );
      if (metadata?.middlewares) {
        explored.push(...metadata.middlewares);
      }
      if (metadata?.includes) {
        explored.push(...this.exploreRouters(routers));
      }
    });

    return explored;
  }
}

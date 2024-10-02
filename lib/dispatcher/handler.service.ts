import { Injectable, Logger, Type } from '@nestjs/common';
import { ExternalContextCreator, ModuleRef, Reflector } from '@nestjs/core';

import { Update, ListenerOptions, NestgramMiddleware } from '../types';
import { Metadata } from '../enums';

import { AppliedRouterOptions } from '../decorators';
import { HandlerParamsFactory } from '../factories';
import { MiddlewareService } from './middleware.service';
import { FilterService } from '../executor/filter.service';

@Injectable()
export class HandlerService {
  private readonly logger = new Logger(HandlerService.name, {
    timestamp: true,
  });

  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly externalContextCreator: ExternalContextCreator,
    private readonly middlewareService: MiddlewareService,
    private readonly paramsFactory: HandlerParamsFactory,
    private readonly filterService: FilterService,
  ) {}

  public executeHandler(instance: object, methodName: string, ...args: any[]) {
    return this.externalContextCreator.create(
      instance,
      instance[methodName],
      methodName,
      Metadata.PARAMS,
      this.paramsFactory,
    )(...args);
  }

  public getMiddlewareStack(router: AppliedRouterOptions, updateType: string) {
    const routers: AppliedRouterOptions[] = [router];
    const middlewares: Type<NestgramMiddleware>[] = [];
    let parent = router.parent;

    while (parent) {
      const metadata: AppliedRouterOptions = this.reflector.get(
        Metadata.ROUTER,
        parent,
      );
      routers.push(metadata);
      parent = metadata.parent;
    }

    routers.reverse().forEach((router) => {
      middlewares.push(...(router.middlewares ?? []));
    });

    return this.middlewareService.filter(middlewares, updateType);
  }

  private async exploreRouter(router: Type, update: Update) {
    const routerMetadata: AppliedRouterOptions = this.reflector.get(
      Metadata.ROUTER,
      router,
    );
    if (!routerMetadata) {
      return;
    }

    const instance = this.moduleRef.get(router);
    const prototype = Object.getPrototypeOf(instance);

    const ownMethods = Reflect.ownKeys(prototype).filter(
      (key) => typeof prototype[key] === 'function',
    );

    for (const methodName of ownMethods) {
      const metadata: ListenerOptions[] = this.reflector.get(
        Metadata.LISTENERS,
        prototype[methodName],
      );
      if (!metadata) {
        continue;
      }
      const isPassed = await this.filterService.passFilters(metadata, update);
      if (isPassed) {
        return { instance, methodName, router: routerMetadata }; // todo: interface
      }
    }

    for (const subRouter of routerMetadata.includes ?? []) {
      const result = await this.exploreRouter(subRouter, update);
      if (result) return result;
    }
  }

  public async findHandler(
    routers: Type[],
    update: Update,
  ): Promise<any | void> {
    for (const router of routers) {
      const handler = await this.exploreRouter(router, update);
      if (handler) {
        this.logger.debug('Handler found!');
        return handler;
      } else {
        this.logger.debug('Handler not found!');
      }
    }
  }
}

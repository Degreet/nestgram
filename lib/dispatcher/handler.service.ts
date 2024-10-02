import { Injectable, Logger, Type } from '@nestjs/common';
import { ExternalContextCreator, ModuleRef, Reflector } from '@nestjs/core';

import { Update, ListenerOptions, NestgramMiddleware } from '../types';
import { Metadata } from '../enums';

import { AppliedRouterOptions } from '../decorators';
import { HandlerParamsFactory } from '../factories';
import { MiddlewareService } from './middleware.service';

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
  ) {}

  public createContext(instance: object, methodName: string) {
    return this.externalContextCreator.create(
      instance,
      instance[methodName],
      methodName,
      Metadata.PARAMS,
      this.paramsFactory,
    );
  }

  private async passFilters(
    metadata: ListenerOptions[],
    updateType: string,
    args: any[],
  ) {
    for (const options of metadata) {
      if (options.updateType !== updateType) continue;

      const result = await Promise.all(
        (options.filters ?? []).map(async (filter) => {
          const instance = this.moduleRef.get(filter);
          const callback = this.createContext(
            instance,
            instance.canActivate.name,
          );
          const result = callback(...args);
          if (result instanceof Promise) await result;
          return result;
        }),
      );
      if (!result.every(Boolean)) continue;

      return true;
    }
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
      // todo
      const isPassed = await this.passFilters(metadata, updateType, args);
      if (isPassed) {
        return { instance, methodName, router: routerMetadata };
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

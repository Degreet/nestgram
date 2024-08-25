import { Injectable, Logger, Type } from '@nestjs/common';
import { ExternalContextCreator, ModuleRef, Reflector } from '@nestjs/core';

import { Update, ListenerOptions } from '../types';
import { Metadata } from '../enums';

import { AppliedRouterOptions } from '../decorators';
import { HandlerParamsFactory } from '../factories';

@Injectable()
export class HandlerService {
  private readonly logger = new Logger(HandlerService.name);

  private readonly paramsFactory = new HandlerParamsFactory();

  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly externalContextCreator: ExternalContextCreator,
  ) {}

  private createContext(instance: any, methodName: string) {
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

  private async exploreRouter(router: Type, updateType: string, args: any[]) {
    const routerMetadata: AppliedRouterOptions = this.reflector.get(
      Metadata.ROUTER,
      router,
    );
    if (!routerMetadata) {
      return;
    }

    const instance = this.moduleRef.get(router);
    const prototype = Object.getPrototypeOf(instance);

    const ownMethods = Reflect.ownKeys(prototype)
      .filter((key) => typeof prototype[key] === 'function')
      .map((key) => ({ methodName: key, method: prototype[key] }));

    for (const { methodName, method } of ownMethods) {
      const metadata: ListenerOptions[] = this.reflector.get(
        Metadata.LISTENERS,
        method,
      );
      if (!metadata) {
        continue;
      }
      const isPassed = await this.passFilters(metadata, updateType, args);
      if (isPassed) {
        return { instance, prototype, methodName };
      }
    }

    for (const subRouter of routerMetadata.includes ?? []) {
      const result = await this.exploreRouter(subRouter, updateType, args);
      if (result) return result;
    }
  }

  public async findHandler(
    routers: Type[],
    update: Update,
    updateType: string,
  ) {
    const args = [update[updateType], update];

    for (const router of routers) {
      const handler = await this.exploreRouter(router, updateType, args);
      if (handler) {
        this.logger.debug('Handler found!');
        const callback = this.createContext(
          handler.instance,
          handler.methodName,
        );
        const response = callback(...args);
        if (response instanceof Promise) await response;
        break;
      } else {
        this.logger.debug('Handler not found!');
      }
    }

    return true;
  }
}

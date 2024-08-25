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

  private createContext(instance: Type, methodName: string) {
    return this.externalContextCreator.create(
      instance,
      instance[methodName],
      methodName,
      Metadata.PARAMS,
      this.paramsFactory,
    );
  }

  private async exploreRouter(router: Type, updateType: string) {
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
      if (metadata?.some((options) => options.updateType === updateType)) {
        return { instance, prototype, methodName };
      }
    }

    for (const subRouter of routerMetadata.includes ?? []) {
      const result = await this.exploreRouter(subRouter, updateType);
      if (result) return result;
    }
  }

  public async findHandler(
    routers: Type[],
    update: Update,
    updateType: string,
  ) {
    for (const router of routers) {
      const handler = await this.exploreRouter(router, updateType);
      if (handler) {
        const callback = this.createContext(
          handler.instance,
          handler.methodName,
        );
        const response = callback(update[updateType], update);
        if (response instanceof Promise) await response;
        break;
      }
    }

    return true;
  }
}

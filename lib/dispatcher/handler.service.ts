import { Injectable, Logger, Type } from '@nestjs/common';
import { ModuleRef, Reflector } from '@nestjs/core';

import { ListenerOptions, Update } from '../types';
import { Metadata } from '../enums';

import { AppliedRouterOptions } from '../decorators';
import { HandlerParamsFactory } from '../factories';
import { FilterService } from '../executor/filter.service';
import { ExploredRouter } from '../types/ExploredRouter';

@Injectable()
export class HandlerService {
  private readonly logger = new Logger(HandlerService.name, {
    timestamp: true,
  });

  constructor(
    private readonly reflector: Reflector,
    private readonly moduleRef: ModuleRef,
    private readonly paramsFactory: HandlerParamsFactory,
    private readonly filterService: FilterService,
  ) {}

  private createContext(instance: object, methodName: string) {
    const metadata: Record<number, any> =
      Reflect.getMetadata(Metadata.PARAMS, instance.constructor, methodName) ||
      {};

    return (...originalArgs: any[]) => {
      const paramTypesLength =
        Reflect.getMetadata('design:paramtypes', instance, methodName)
          ?.length || 0;

      const finalArgs = Array.from({ length: paramTypesLength }, (_, index) => {
        const paramMeta = metadata[index];
        if (paramMeta) {
          return this.paramsFactory.exchangeKeyForValue(
            paramMeta.type,
            paramMeta,
            originalArgs,
          );
        }
        return originalArgs[index];
      });

      return instance[methodName](...finalArgs);
    };
  }

  private async exploreRouter(
    router: Type,
    update: Update,
    data: any,
  ): Promise<ExploredRouter | null> {
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
      const isPassed = await this.filterService.passFilters(
        metadata,
        update,
        data,
      );
      if (isPassed) {
        return {
          router: routerMetadata,
          handler: this.createContext(instance, methodName as string),
        };
      }
    }

    for (const subRouter of routerMetadata.includes ?? []) {
      const result = await this.exploreRouter(subRouter, update, data);
      if (result) return result;
    }
  }

  async findHandler(
    routers: Type[],
    update: Update,
    data: any,
  ): Promise<ExploredRouter | void> {
    for (const router of routers) {
      const handler = await this.exploreRouter(router, update, data);
      if (handler) {
        this.logger.debug('Handler found!');
        return handler;
      } else {
        this.logger.debug('Handler not found!');
      }
    }
  }
}

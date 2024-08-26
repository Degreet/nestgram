import { Injectable, Logger, Type } from '@nestjs/common';
import { ExternalContextCreator, ModuleRef } from '@nestjs/core';

import { HandlerParamsFactory } from '../factories';
import { Metadata } from '../enums';
import { FilteredNestgramMiddleware, NestgramMiddleware } from '../types';

@Injectable()
export class MiddlewareService {
  private readonly logger = new Logger(MiddlewareService.name, {
    timestamp: true,
  });

  private readonly paramsFactory = new HandlerParamsFactory();

  constructor(
    private readonly externalContextCreator: ExternalContextCreator,
    private readonly moduleRef: ModuleRef,
  ) {}

  public filter(middlewares: Type<NestgramMiddleware>[], updateType: string) {
    const filtered: FilteredNestgramMiddleware[] = [];

    middlewares.forEach((middleware) => {
      const instance = this.moduleRef.get(middleware);
      const { updateTypes } = instance;
      if (!updateTypes || updateTypes.includes(updateType)) {
        filtered.push({ instance, name: middleware.name });
      }
    });

    return filtered;
  }

  public createContext(middleware: NestgramMiddleware) {
    return this.externalContextCreator.create(
      middleware,
      middleware.use,
      middleware.use.name,
      Metadata.PARAMS,
      this.paramsFactory,
    );
  }

  public runMiddlewarePipeline(
    middlewares: FilteredNestgramMiddleware[],
    args: any[],
    callback: () => any | Promise<any>,
    index = 0,
  ) {
    if (index < middlewares.length) {
      const { instance, name } = middlewares[index];
      this.logger.debug('Executing ' + name);

      const handler = this.createContext(instance);
      return handler(...args, () => {
        return this.runMiddlewarePipeline(
          middlewares,
          args,
          callback,
          index + 1,
        );
      });
    } else {
      return callback();
    }
  }
}

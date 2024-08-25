import { Injectable, Logger, Type } from '@nestjs/common';
import { ExternalContextCreator, ModuleRef } from '@nestjs/core';

import { HandlerParamsFactory } from '../factories';
import { Metadata } from '../enums';
import { NestgramMiddleware } from '../types';

@Injectable()
export class MiddlewareService {
  private readonly logger = new Logger(MiddlewareService.name);

  private readonly paramsFactory = new HandlerParamsFactory();

  constructor(
    private readonly externalContextCreator: ExternalContextCreator,
    private readonly moduleRef: ModuleRef,
  ) {}

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
    middlewares: Type<NestgramMiddleware>[],
    args: any[],
    callback: () => any | Promise<any>,
    index = 0,
  ) {
    if (index < middlewares.length) {
      const instance = this.moduleRef.get(middlewares[index]);
      const middlewareName = middlewares[index].name;

      this.logger.debug('Executing ' + middlewareName);

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

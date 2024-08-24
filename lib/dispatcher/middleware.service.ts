import { Injectable, Logger } from '@nestjs/common';
import { NestgramMiddleware } from '../types/NestgramMiddleware';
import { ExternalContextCreator } from '@nestjs/core';
import { HandlerParamsFactory } from '../factories/params.factory';
import { Metadata } from '../enums';

@Injectable()
export class MiddlewareService {
  private readonly logger = new Logger(MiddlewareService.name);

  private readonly paramsFactory = new HandlerParamsFactory();

  constructor(
    private readonly externalContextCreator: ExternalContextCreator,
  ) {}

  public execute(middleware: NestgramMiddleware, name?: string) {
    this.logger.debug(`Executing ${name} middleware`);
    const callback = this.externalContextCreator.create(
      middleware,
      middleware.use,
      middleware.use.name,
      Metadata.PARAMS,
      this.paramsFactory,
    );
    return callback();
  }
}

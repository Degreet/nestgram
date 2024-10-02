import { Inject, Injectable, Logger } from '@nestjs/common';

import { HandlerService, MiddlewareService } from '../dispatcher';
import { DispatcherOptions, Update } from '../types';
import { Providers } from '../enums';

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);

  constructor(
    @Inject(Providers.DISPATCHER_OPTIONS)
    private readonly options: DispatcherOptions,
    private readonly middlewareService: MiddlewareService,
    private readonly handlerService: HandlerService,
  ) {}

  private extractUpdateType(update: Update): string {
    const keys = Object.keys(update);
    const [updateType] = keys.filter((key) => key !== 'update_id');
    return updateType;
  }

  private processOuterMiddlewares(update: Update) {
    const updateType = this.extractUpdateType(update);

    const outerMiddlewares = this.options.outerMiddlewares || [];

    return this.middlewareService.runMiddlewarePipeline(
      this.middlewareService.filter(outerMiddlewares, updateType),
      [update[updateType]],
      () => this.processHandlerSearch(update),
    );
  }

  private processHandlerSearch(update: Update) {
    const handler = this.handlerService.findHandler(
      this.options.routers ?? [],
      update,
    );

    if (handler) {
      return this.processInnerMiddlewares(update, handler);
    }
  }

  private async processInnerMiddlewares(update: Update, handler: any) {
    const updateType = this.extractUpdateType(update);

    const data = {};
    const args = [update[updateType], data];

    const innerMiddlewares = this.handlerService.getMiddlewareStack(
      handler.router,
      updateType,
    );

    await this.middlewareService.runMiddlewarePipeline(
      innerMiddlewares,
      args,
      () => this.processHandlerExecuting(args, handler),
    );
  }

  private processHandlerExecuting(args: any[], handler: any) {
    const callback = this.handlerService.createContext(
      handler.instance,
      handler.methodName,
    );
    return callback(...args);
  }

  public async processUpdate(update: Update) {
    this.logger.log('Processing update #' + update.update_id);
    this.logger.debug(update);

    await this.processOuterMiddlewares(update);
  }
}

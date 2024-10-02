import { Inject, Injectable, Logger } from '@nestjs/common';
import { extractUpdateType } from '../utils/extractUpdateType';

import { HandlerService, MiddlewareService } from '../dispatcher';
import { DispatcherOptions, Update } from '../types';
import { Providers } from '../enums';
import { ExploredRouter } from '../types/ExploredRouter';

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);

  constructor(
    @Inject(Providers.DISPATCHER_OPTIONS)
    private readonly options: DispatcherOptions,
    private readonly middlewareService: MiddlewareService,
    private readonly handlerService: HandlerService,
  ) {}

  private processOuterMiddlewares(update: Update) {
    const updateType = extractUpdateType(update);

    const outerMiddlewares = this.options.outerMiddlewares || [];

    return this.middlewareService.runMiddlewarePipeline(
      this.middlewareService.filter(outerMiddlewares, updateType),
      [update[updateType]],
      () => this.processHandlerSearch(update),
    );
  }

  private async processHandlerSearch(update: Update) {
    const exploredRouter = await this.handlerService.findHandler(
      this.options.routers ?? [],
      update,
    );

    if (exploredRouter) {
      return this.processInnerMiddlewares(update, exploredRouter);
    }
  }

  private async processInnerMiddlewares(
    update: Update,
    exploredRouter: ExploredRouter,
  ) {
    const updateType = extractUpdateType(update);

    const data = {};
    const args = [update[updateType], data];

    const innerMiddlewares = this.handlerService.getMiddlewareStack(
      exploredRouter.router,
      updateType,
    );

    await this.middlewareService.runMiddlewarePipeline(
      innerMiddlewares,
      args,
      () => exploredRouter.handler(...args),
    );
  }

  public async processUpdate(update: Update) {
    this.logger.log('Processing update #' + update.update_id);
    this.logger.debug(update);

    await this.processOuterMiddlewares(update);
  }
}

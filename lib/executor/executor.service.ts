import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { extractUpdateType } from '../utils/extractUpdateType';

import { HandlerService, MiddlewareService } from '../dispatcher';
import { Providers } from '../enums';
import { ExploredRouter } from '../types/ExploredRouter';
import { BotService } from '../bot';

import { DispatcherOptions, Update, UpdateObject } from '../types';
import { CallbackQuery, Message } from '../updateObjects';

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);

  private readonly UPDATE_OBJECTS = {
    message: Message,
    callback_query: CallbackQuery,
  };

  constructor(
    @Inject(Providers.DISPATCHER_OPTIONS)
    private readonly options: DispatcherOptions,
    @Inject(forwardRef(() => HandlerService))
    private readonly handlerService: HandlerService,
    @Inject(forwardRef(() => MiddlewareService))
    private readonly middlewareService: MiddlewareService,
    @Inject(forwardRef(() => BotService))
    private readonly botService: BotService,
  ) {}

  private buildUpdateObject(update: Update, updateType: string) {
    const updateObject = this.UPDATE_OBJECTS[updateType];
    if (updateObject) {
      return updateObject.fromObject(this.botService, update[updateType]);
    }
  }

  private processOuterMiddlewares(update: Update) {
    const updateType = extractUpdateType(update);

    const updateObject = this.buildUpdateObject(update, updateType);

    const outerMiddlewares = this.options.outerMiddlewares || [];

    return this.middlewareService.runMiddlewarePipeline(
      this.middlewareService.filter(outerMiddlewares, updateType),
      [updateObject],
      () => this.processHandlerSearch(updateObject),
    );
  }

  private async processHandlerSearch(updateObject: UpdateObject) {
    const exploredRouter = await this.handlerService.findHandler(
      this.options.routers ?? [],
      updateObject,
    );

    if (exploredRouter) {
      return this.processInnerMiddlewares(updateObject, exploredRouter);
    }
  }

  private async processInnerMiddlewares(
    updateObject: UpdateObject,
    exploredRouter: ExploredRouter,
  ) {
    const updateType = updateObject.updateTitle;

    const data = {};
    const args = [updateObject, data];

    const innerMiddlewares = this.middlewareService.getRouterStack(
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
    this.logger.debug('Processing update #' + update.update_id);
    this.logger.debug(update);

    await this.processOuterMiddlewares(update);
  }
}

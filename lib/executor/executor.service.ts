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
    edited_message: Message,
    channel_post: Message,
    edited_channel_post: Message,
    business_message: Message,
    edited_business_message: Message,
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
      return updateObject.fromUpdate(this.botService, update, updateType);
    }
    this.logger.warn(
      'Failed to find update object by update type ' + updateType,
    );
    return update[updateType];
  }

  private processOuterMiddlewares(update: Update) {
    const data = {};
    const updateType = extractUpdateType(update);

    const updateObject = this.buildUpdateObject(update, updateType);

    const outerMiddlewares = this.options.outerMiddlewares || [];

    return this.middlewareService.runMiddlewarePipeline(
      this.middlewareService.filter(outerMiddlewares, updateType),
      (next) => [updateObject, next, data],
      () => this.processHandlerSearch(updateObject, data),
    );
  }

  private async processHandlerSearch(updateObject: UpdateObject, data: any) {
    const exploredRouter = await this.handlerService.findHandler(
      this.options.routers ?? [],
      updateObject,
      data,
    );
    if (exploredRouter) {
      return this.processInnerMiddlewares(updateObject, exploredRouter, data);
    }
  }

  private async processInnerMiddlewares(
    updateObject: UpdateObject,
    exploredRouter: ExploredRouter,
    data: any,
  ) {
    const updateType = updateObject.updateTitle;

    const innerMiddlewares = this.middlewareService.getRouterStack(
      exploredRouter.router,
      updateType,
    );

    await this.middlewareService.runMiddlewarePipeline(
      innerMiddlewares,
      (next) => [updateObject, next, data],
      () => exploredRouter.handler(updateObject, data),
    );
  }

  public async processUpdate(update: Update) {
    this.logger.debug('Processing update #' + update.update_id);
    this.logger.verbose(update);

    await this.processOuterMiddlewares(update);
  }
}

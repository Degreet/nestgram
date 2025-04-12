import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common';
import { extractUpdateType } from '../utils/extractUpdateType';

import { HandlerService, MiddlewareService } from '../dispatcher';
import { Providers } from '../enums';
import { ExploredRouter } from '../types/ExploredRouter';
import { BotService } from '../bot';

import { DispatcherOptions, Update } from '../types';
import { getTelegramObjectByUpdateType } from '../decorators';

@Injectable()
export class ExecutorService {
  private readonly logger = new Logger(ExecutorService.name);

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

  private mutateUpdateObject(update: Update) {
    const updateType = extractUpdateType(update);
    update._updateType = updateType;

    const TargetClass = getTelegramObjectByUpdateType(updateType);
    if (TargetClass) {
      update._telegramObject = new TargetClass(
        this.botService,
        update[updateType],
      );
    } else {
      this.logger.warn(`Update type ${updateType} not found`);
      update._telegramObject = update[updateType];
    }
  }

  private processOuterMiddlewares(update: Update) {
    const data = {};
    const outerMiddlewares = this.options.outerMiddlewares || [];
    const object = update._telegramObject;

    return this.middlewareService.runMiddlewarePipeline(
      this.middlewareService.filter(outerMiddlewares, update._updateType),
      (next) => [object, next, data],
      () => this.processHandlerSearch(update, data),
    );
  }

  private async processHandlerSearch(update: Update, data: any) {
    const exploredRouter = await this.handlerService.findHandler(
      this.options.routers ?? [],
      update,
      data,
    );
    if (exploredRouter) {
      return this.processInnerMiddlewares(update, exploredRouter, data);
    }
  }

  private async processInnerMiddlewares(
    update: Update,
    exploredRouter: ExploredRouter,
    data: any,
  ) {
    const object = update._telegramObject;

    const innerMiddlewares = this.middlewareService.getRouterStack(
      exploredRouter.router,
      update._updateType,
    );

    await this.middlewareService.runMiddlewarePipeline(
      innerMiddlewares,
      (next) => [object, next, data],
      () => exploredRouter.handler(object, data),
    );
  }

  public async processUpdate(update: Update) {
    this.logger.debug('Processing update #' + update.update_id);
    this.logger.verbose(update);

    this.mutateUpdateObject(update);
    await this.processOuterMiddlewares(update);
  }
}

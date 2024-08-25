import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
  Type,
} from '@nestjs/common';

import { BotService } from '../bot';
import { Metadata, Providers } from '../enums';

import { DispatcherOptions, Update } from '../types';

import { MiddlewareService } from './middleware.service';
import { GetUpdates } from '../methods';
import { ModuleRef, Reflector } from '@nestjs/core';
import { AppliedRouterOptions } from '../decorators';
import { ListenerOptions } from '../types/ListenerOptions';

@Injectable()
export class DispatcherService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DispatcherService.name);

  private isPollingRunning = false;
  private abortController: AbortController;

  private readonly getUpdates: GetUpdates;

  constructor(
    @Inject(Providers.DISPATCHER_OPTIONS)
    private readonly options: DispatcherOptions,
    private readonly botService: BotService,
    private readonly middlewareService: MiddlewareService,
    private readonly moduleRef: ModuleRef,
    private readonly reflector: Reflector,
  ) {
    this.getUpdates = new GetUpdates(this.botService.token, {
      offset: options.offset ?? 0,
      limit: options.limit,
      timeout: options.timeout,
      allowed_updates: options.allowed_updates,
    });
  }

  public async onModuleInit() {
    if (this.options.startPolling) {
      await this.prepareToLaunch();
      this.startPolling();
    }
  }

  public async onApplicationShutdown() {
    await this.stopPolling();
  }

  private async prepareToLaunch() {
    await this.botService.deleteWebhook({
      drop_pending_updates: this.options.dropPendingUpdates,
    });

    const me = await this.botService.getMe();
    this.logger.debug(`Bot @${me.username} prepared to launch`);
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
    const ownKeys = Reflect.ownKeys(prototype);

    for (const methodName of ownKeys) {
      const method = prototype[methodName];
      if (typeof method !== 'function') {
        continue;
      }

      const metadata: ListenerOptions[] = this.reflector.get(
        Metadata.LISTENERS,
        method,
      );
      if (!metadata) {
        continue;
      }

      if (metadata.every((options) => options.updateType !== updateType)) {
        continue;
      }

      return { instance, prototype, methodName };
    }

    for (const subRouter of routerMetadata.includes ?? []) {
      const result = await this.exploreRouter(subRouter, updateType);
      if (result) return result;
    }
  }

  private async findHandler(update: Update, updateType: string) {
    for (const router of this.options.routers ?? []) {
      const handler = await this.exploreRouter(router, updateType);
      if (handler) {
        this.middlewareService.createHandlerContext(
          handler.instance,
          handler.prototype[handler.methodName],
          handler.methodName,
        )(updateType);
        break;
      }
    }
  }

  private async processUpdate(update: Update) {
    this.logger.log('Processing update #' + update.update_id);
    this.logger.debug(update);

    const keys = Object.keys(update);
    const [updateType] = keys.filter((key) => key !== 'update_id');

    await this.middlewareService.runMiddlewarePipeline(
      this.options.outerMiddlewares || [],
      [updateType],
      () => this.findHandler(update, updateType),
    );
  }

  private async handleUpdates() {
    try {
      const updates = await this.getUpdates.fetch(this.abortController.signal);

      for (const update of updates) {
        await this.processUpdate(update);
        this.getUpdates.options.offset = update.update_id + 1;
      }
    } catch (error) {
      if (error.name === 'AbortError') return;
      throw error;
    }
  }

  public async startPolling() {
    if (this.isPollingRunning) {
      return this.logger.error('Polling already running!');
    }

    this.logger.log('Polling is started!');

    this.abortController = new AbortController();
    this.isPollingRunning = true;

    while (!this.abortController.signal.aborted) {
      await this.handleUpdates();
    }

    this.logger.debug('Polling is stopped!');
  }

  public async stopPolling() {
    this.logger.debug('Stopping the polling...');
    this.isPollingRunning = false;
    this.abortController?.abort();
  }
}

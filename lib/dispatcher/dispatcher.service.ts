import { Reflector } from '@nestjs/core';
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

import { AppliedRouterOptions, RouterOptions } from '../decorators';
import { DispatcherOptions, Update } from '../types';

import { MiddlewareService } from './middleware.service';
import { GetUpdates } from '../methods';

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
    this.applyRouters();

    if (this.options.startPolling) {
      await this.prepareToLaunch();
      this.startPolling();
    }
  }

  public async onApplicationShutdown() {
    await this.stopPolling();
  }

  private applyRouters() {
    for (const router of this.options.routers ?? []) {
      this.applyRouter(router);
    }
  }

  private applyRouter(router: Type, parent?: Type) {
    const options: RouterOptions = this.reflector.get(Metadata.ROUTER, router);
    if (!options) {
      return this.logger.error(router.name + ' is not a router');
    }

    const appliedOptions: AppliedRouterOptions = { ...options, parent };

    Reflect.defineMetadata(Metadata.ROUTER, appliedOptions, router);

    options.includes?.forEach((subRouter) => {
      this.applyRouter(subRouter, router);
    });
  }

  private async prepareToLaunch() {
    await this.botService.deleteWebhook({
      drop_pending_updates: this.options.dropPendingUpdates,
    });

    const me = await this.botService.getMe();
    this.logger.debug(`Bot @${me.username} prepared to launch`);
  }

  private async processUpdate(update: Update) {
    this.logger.log('Processing update #' + update.update_id);
    this.logger.debug(update);
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

import {
  Inject,
  Injectable,
  Logger,
  OnApplicationShutdown,
  OnModuleInit,
} from '@nestjs/common';

import { BotService } from '../bot';
import { Providers } from '../enums';

import { DispatcherOptions, Update } from '../types';
import { GetUpdates } from '../methods';

import { MiddlewareService } from './middleware.service';
import { HandlerService } from './handler.service';

@Injectable()
export class DispatcherService implements OnModuleInit, OnApplicationShutdown {
  private readonly logger = new Logger(DispatcherService.name);
  private readonly getUpdates: GetUpdates;

  private abortController: AbortController;
  private isPollingRunning = false;

  constructor(
    @Inject(Providers.DISPATCHER_OPTIONS)
    private readonly options: DispatcherOptions,
    private readonly botService: BotService,
    private readonly middlewareService: MiddlewareService,
    private readonly handlerService: HandlerService,
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

  private async processUpdate(update: Update) {
    this.logger.log('Processing update #' + update.update_id);
    this.logger.debug(update);

    const keys = Object.keys(update);
    const [updateType] = keys.filter((key) => key !== 'update_id');

    const outerMiddlewares = this.options.outerMiddlewares || [];

    await this.middlewareService.runMiddlewarePipeline(
      this.middlewareService.filter(outerMiddlewares, updateType),
      [update[updateType], update],
      () => {
        return this.handlerService.findHandler(
          this.options.routers ?? [],
          update,
          updateType,
        );
      },
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

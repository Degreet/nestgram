import { Reflector } from '@nestjs/core';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { BotService } from '../bot';
import { Metadata, Providers } from '../enums';
import { AppliedRouterOptions, RouterOptions } from '../decorators';
import { MiddlewareService } from './middleware.service';

import { DispatcherOptions, RouterClass } from '../types/DispatcherOptions';

@Injectable()
export class DispatcherService implements OnModuleInit {
  private readonly logger = new Logger(DispatcherService.name);

  constructor(
    @Inject(Providers.DISPATCHER_OPTIONS)
    private readonly options: DispatcherOptions,
    private readonly botService: BotService,
    private readonly middlewareService: MiddlewareService,
    private readonly reflector: Reflector,
  ) {}

  public async onModuleInit() {
    this.applyRouters();

    await this.prepareToLaunch();

    if (this.options.startPolling) {
      this.startPolling();
    }
  }

  private applyRouters() {
    for (const router of this.options.routers ?? []) {
      this.applyRouter(router);
    }
  }

  private applyRouter(router: RouterClass, parent?: RouterClass) {
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
    this.logger.log(`Bot @${me.username} prepared to launch`);
  }

  private async startPolling() {
    // todo: run polling
  }
}

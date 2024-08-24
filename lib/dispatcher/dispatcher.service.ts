import { Reflector } from '@nestjs/core';
import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { BotService } from '../bot';
import { Metadata, Providers } from '../enums';
import { AppliedRouterOptions, RouterOptions } from '../decorators';

import { DispatcherOptions, RouterClass } from '../types/DispatcherOptions';
import { Update } from '../types';

@Injectable()
export class DispatcherService implements OnModuleInit {
  private readonly logger = new Logger(DispatcherService.name);

  constructor(
    @Inject(Providers.DISPATCHER_OPTIONS)
    private readonly options: DispatcherOptions,
    private readonly botService: BotService,
    private readonly reflector: Reflector,
  ) {}

  public async onModuleInit() {
    this.applyRouters();

    await this.prepareToLaunch();

    if (this.options.start_polling) {
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

    options.include?.forEach((subRouter) => {
      this.applyRouter(subRouter, router);
    });
  }

  private async prepareToLaunch() {
    await this.botService.deleteWebhook({
      drop_pending_updates: this.options.drop_pending_updates,
    });

    const me = await this.botService.getMe();
    this.logger.log(`Bot @${me.username} prepared to launch`);
  }

  private async startPolling() {
    // todo: run polling
  }
}

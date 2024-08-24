import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DispatcherOptions, RouterClass } from '../types/DispatcherOptions';
import { BotService } from '../bot';
import { Metadata, Providers } from '../enums';
import { Reflector } from '@nestjs/core';

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
    if (!this.options.routers?.length) {
      return;
    }

    for (const router of this.options.routers) {
      const isRouter = this.reflector.get(Metadata.ROUTER, router);
      if (!isRouter) {
        this.logger.error(
          'Add the @Router() decorator to make the provider a router',
        );
        continue;
      }
      this.applyRouter(router);
    }
  }

  private applyRouter(router: RouterClass) {
    console.log(router);
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

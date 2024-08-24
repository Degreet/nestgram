import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';

import { DispatcherOptions } from '../types/DispatcherOptions';
import { BotService } from '../bot';
import { Providers } from '../enums';

@Injectable()
export class DispatcherService implements OnModuleInit {
  private readonly logger = new Logger(DispatcherService.name);

  constructor(
    @Inject(Providers.DISPATCHER_OPTIONS)
    private readonly options: DispatcherOptions,
    private readonly botService: BotService,
  ) {}

  async onModuleInit() {
    this.applyRouters();

    await this.prepareToLaunch();

    if (this.options.start_polling) {
      this.startPolling();
    }
  }

  applyRouters() {
    if (!this.options.routers?.length) {
      return;
    }

    // todo: apply every router in this.options.routers
  }

  async prepareToLaunch() {
    await this.botService.deleteWebhook({
      drop_pending_updates: this.options.drop_pending_updates,
    });

    const me = await this.botService.getMe();
    this.logger.log(`Bot @${me.username} prepared to launch`);
  }

  async startPolling() {
    // todo: run polling
  }
}

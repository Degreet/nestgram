import { Logger } from '@nestjs/common';
import { BotOptions, Update } from '../types';
import { Api } from '../api';
import { Dispatcher } from './dispatcher';

export class Bot {
  private readonly api;
  private readonly logger = new Logger(Bot.name);

  private nextUpdateId = 0;
  private isPollingRunning = false;

  constructor(
    private readonly options: BotOptions,
    private readonly dispatcher?: Dispatcher,
  ) {
    this.api = new Api(options.token);
  }

  async handleUpdate(update: Update) {
    this.logger.debug(update);
    await this.dispatcher.processUpdate(update);
  }

  async loop() {
    while (this.isPollingRunning) {
      const updates = await this.api.getUpdates({
        offset: this.nextUpdateId,
      });

      for (const update of updates) {
        this.nextUpdateId = update.update_id + 1;
        await this.handleUpdate(update);
      }
    }

    await this.api.getUpdates({
      offset: this.nextUpdateId,
    });
  }

  async start() {
    if (this.isPollingRunning) {
      this.logger.error('Long polling already running!');
      return;
    }

    const me = await this.api.getMe();

    await this.api.deleteWebhook({
      drop_pending_updates: this.options.drop_pending_updates,
    });

    this.isPollingRunning = true;
    this.logger.debug('Bot started on @' + me.username);

    await this.loop();
  }

  stop() {
    this.isPollingRunning = false;
    this.logger.debug('Bot stopped!');
  }
}

import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BotService, escapeHtml, I18nManager } from 'nestgram';
import { Job } from 'bullmq';

import { REMINDER_QUEUE } from './reminder.constants';
import type { DeliverJob } from './deliver-job.type';
import { ReminderService } from './reminder.service';

@Processor(REMINDER_QUEUE)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger('ReminderWorker');

  constructor(
    private readonly reminders: ReminderService,
    private readonly bot: BotService,
    private readonly i18n: I18nManager,
  ) {
    super();
  }

  async process(job: Job<DeliverJob>): Promise<void> {
    const reminder = await this.reminders.findById(job.data.reminderId);
    if (!reminder || reminder.status !== 'pending') {
      return;
    }

    const translate = this.i18n.translator(reminder.locale);
    await this.bot.sendMessage(
      reminder.chatId,
      translate('remind.delivered', { text: escapeHtml(reminder.text) }),
    );
    await this.reminders.markDelivered(reminder.id);
    this.logger.log(`Delivered reminder #${reminder.id}`);
  }
}

import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { BotService } from 'nestgram';
import { Job } from 'bullmq';

import { escapeHtml } from '../common/escape-html';
import { REMINDER_QUEUE } from './reminder.constants';
import { ReminderService, DeliverJob } from './reminder.service';

/**
 * Delivers due reminders. This runs in the BullMQ worker — OUTSIDE the
 * per-update request context — so it talks to Telegram through the injected
 * `BotService` and reads the chat id from the job payload. (The ambient
 * per-update context does not cross the queue boundary; the chat id is carried
 * explicitly, exactly as the framework's design prescribes.)
 */
@Processor(REMINDER_QUEUE)
export class ReminderProcessor extends WorkerHost {
  private readonly logger = new Logger('ReminderWorker');

  constructor(
    private readonly reminders: ReminderService,
    private readonly bot: BotService,
  ) {
    super();
  }

  async process(job: Job<DeliverJob>): Promise<void> {
    const reminder = await this.reminders.findById(job.data.reminderId);
    if (!reminder || reminder.status !== 'pending') {
      return; // done/deleted before it fired
    }

    await this.bot.sendMessage(
      reminder.chatId,
      `⏰ <b>Reminder</b>\n${escapeHtml(reminder.text)}`,
    );
    await this.reminders.markDelivered(reminder.id);
    this.logger.log(`Delivered reminder #${reminder.id}`);
  }
}

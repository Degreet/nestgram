import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { REMINDER_QUEUE } from './reminder.constants';
import { Reminder } from './reminder.entity';
import { ReminderParser } from './reminder.parser';
import { ReminderPresenter } from './reminder.presenter';
import { ReminderProcessor } from './reminder.processor';
import { ReminderRouter } from './reminder.router';
import { ReminderService } from './reminder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reminder]),
    BullModule.registerQueue({ name: REMINDER_QUEUE }),
  ],
  providers: [
    ReminderService,
    ReminderParser,
    ReminderPresenter,
    ReminderProcessor,
    ReminderRouter,
  ],
  exports: [ReminderService],
})
export class RemindersModule {}

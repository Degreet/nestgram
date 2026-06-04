import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';

import { REMINDER_QUEUE } from './reminder.constants';
import { Reminder } from './reminder.entity';
import { ReminderProcessor } from './reminder.processor';
import { ReminderRouter } from './reminder.router';
import { ReminderService } from './reminder.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Reminder]),
    BullModule.registerQueue({ name: REMINDER_QUEUE }),
  ],
  // ReminderRouter is just another provider — discovery finds it because it's
  // here, no registration in the module's metadata beyond the providers array.
  providers: [ReminderService, ReminderProcessor, ReminderRouter],
  exports: [ReminderService],
})
export class RemindersModule {}

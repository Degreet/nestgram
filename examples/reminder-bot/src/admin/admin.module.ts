import { Module } from '@nestjs/common';

import { RemindersModule } from '../reminders/reminders.module';
import { AdminGuard } from './admin.guard';
import { AdminRouter } from './admin.router';

@Module({
  imports: [RemindersModule],
  providers: [AdminGuard, AdminRouter],
})
export class AdminModule {}

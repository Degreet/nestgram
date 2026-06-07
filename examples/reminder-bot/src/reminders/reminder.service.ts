import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { Repository } from 'typeorm';

import { DELIVER_JOB, REMINDER_QUEUE } from './reminder.constants';
import type { DeliverJob } from './deliver-job.type';
import { Reminder } from './reminder.entity';

@Injectable()
export class ReminderService {
  constructor(
    @InjectRepository(Reminder) private readonly repo: Repository<Reminder>,
    @InjectQueue(REMINDER_QUEUE) private readonly queue: Queue<DeliverJob>,
  ) {}

  async schedule(
    chatId: number | string,
    userId: number | string,
    text: string,
    dueAt: Date,
    locale: string,
  ): Promise<Reminder> {
    const reminder = await this.repo.save(
      this.repo.create({
        chatId: String(chatId),
        userId: String(userId),
        text,
        dueAt,
        locale,
        status: 'pending',
      }),
    );

    await this.queue.add(
      DELIVER_JOB,
      { reminderId: reminder.id },
      {
        delay: Math.max(0, dueAt.getTime() - Date.now()),
        jobId: `reminder-${reminder.id}`,
        removeOnComplete: true,
        removeOnFail: 100,
      },
    );

    return reminder;
  }

  pendingFor(chatId: number | string): Promise<Reminder[]> {
    return this.repo.find({
      where: { chatId: String(chatId), status: 'pending' },
      order: { dueAt: 'ASC' },
      take: 20,
    });
  }

  findById(id: number): Promise<Reminder | null> {
    return this.repo.findOne({ where: { id } });
  }

  async markDone(id: number): Promise<void> {
    await this.repo.update({ id }, { status: 'done' });
    await this.cancelJob(id);
  }

  async markDelivered(id: number): Promise<void> {
    await this.repo.update({ id }, { status: 'delivered' });
  }

  async remove(id: number): Promise<void> {
    await this.cancelJob(id);
    await this.repo.delete({ id });
  }

  countPending(): Promise<number> {
    return this.repo.count({ where: { status: 'pending' } });
  }

  countAll(): Promise<number> {
    return this.repo.count();
  }

  async knownChatIds(): Promise<string[]> {
    const rows = await this.repo
      .createQueryBuilder('r')
      .select('DISTINCT r.chatId', 'chatId')
      .getRawMany<{ chatId: string }>();
    return rows.map((row) => row.chatId);
  }

  private async cancelJob(id: number): Promise<void> {
    const job = await this.queue.getJob(`reminder-${id}`);
    await job?.remove();
  }
}

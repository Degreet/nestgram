import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { ReminderStatus } from './reminder-status.type';

@Entity('reminders')
export class Reminder {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index()
  @Column({ type: 'bigint' })
  chatId!: string;

  @Column({ type: 'bigint' })
  userId!: string;

  @Column('text')
  text!: string;

  @Column({ type: 'timestamptz' })
  dueAt!: Date;

  @Column({ type: 'varchar', length: 8 })
  locale!: string;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: ReminderStatus;

  @CreateDateColumn()
  createdAt!: Date;
}

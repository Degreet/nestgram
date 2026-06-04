import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type ReminderStatus = 'pending' | 'done' | 'delivered';

/**
 * A scheduled reminder. `chatId`/`userId` are stored as `bigint` (string in JS)
 * — Telegram chat ids can exceed the safe-integer range, and BotService accepts
 * a string chat id directly.
 */
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

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'pending' })
  status!: ReminderStatus;

  @CreateDateColumn()
  createdAt!: Date;
}

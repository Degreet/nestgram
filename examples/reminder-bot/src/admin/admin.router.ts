import { UseGuards } from '@nestjs/common';
import {
  BotService,
  Command,
  escapeHtml,
  Message,
  Payload,
  Router,
} from 'nestgram';

import { ReminderService } from '../reminders/reminder.service';
import { AdminGuard } from './admin.guard';

/**
 * Admin-only commands. `@UseGuards(AdminGuard)` at the class level gates every
 * handler — a non-admin's `/stats` is matched, the guard denies it, and the
 * pipeline isolates the rejection (no reply, the command stays invisible).
 */
@Router()
@UseGuards(AdminGuard)
export class AdminRouter {
  constructor(
    private readonly reminders: ReminderService,
    private readonly bot: BotService,
  ) {}

  @Command('stats')
  async stats(message: Message) {
    const [total, pending] = await Promise.all([
      this.reminders.countAll(),
      this.reminders.countPending(),
    ]);
    return message.answer(
      `📊 <b>Stats</b>\nTotal: <b>${total}</b>\nPending: <b>${pending}</b>`,
    );
  }

  @Command('broadcast')
  async broadcast(message: Message, @Payload() text: string) {
    if (text.trim().length === 0) {
      return message.answer('Usage: <code>/broadcast &lt;message&gt;</code>');
    }

    const chatIds = await this.reminders.knownChatIds();
    let sent = 0;
    for (const chatId of chatIds) {
      try {
        await this.bot.sendMessage(chatId, `📣 ${escapeHtml(text)}`);
        sent += 1;
      } catch {
        // One recipient blocking the bot must not fail the whole broadcast.
      }
    }
    return message.answer(`Delivered to ${sent}/${chatIds.length} chat(s).`);
  }
}

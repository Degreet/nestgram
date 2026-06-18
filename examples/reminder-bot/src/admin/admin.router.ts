import { UseGuards } from '@nestjs/common';
import {
  BotService,
  Command,
  escapeHtml,
  Message,
  Param,
  Router,
  t,
} from 'nestgram';

import { ReminderService } from '../reminders/reminder.service';
import { AdminGuard } from './admin.guard';

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
    return message.answer(t('admin.stats', { total, pending }));
  }

  // No text → the disjoint bare route below replies with usage (arity overloading).
  @Command('broadcast :text...')
  async broadcast(message: Message, @Param('text') text: string) {
    const body = t('admin.broadcast.message', { text: escapeHtml(text) });
    const chatIds = await this.reminders.knownChatIds();
    const results = await Promise.all(
      chatIds.map((chatId) =>
        this.bot
          .sendMessage(chatId, body)
          .then(() => true)
          .catch(() => false),
      ),
    );
    const sent = results.filter(Boolean).length;
    return message.answer(
      t('admin.broadcast.result', { sent, total: chatIds.length }),
    );
  }

  // `/broadcast` with no text — disjoint from the route above by exact arity.
  @Command('broadcast')
  broadcastUsage(message: Message) {
    return message.answer(t('admin.broadcast.usage'));
  }
}

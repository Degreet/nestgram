import { UseInterceptors } from '@nestjs/common';
import {
  Action,
  CallbackQuery,
  Command,
  Data,
  escapeHtml,
  Hears,
  InlineKeyboard,
  Message,
  Payload,
  Router,
  Sender,
  User,
} from 'nestgram';

import { mainMenu, MENU } from '../common/keyboards';
import { LoggingInterceptor } from '../common/logging.interceptor';
import { DeleteCb, DoneCb } from './reminder.callbacks';
import { parseReminder } from './reminder.parser';
import { ReminderService } from './reminder.service';

const HELP = [
  '<b>Reminder bot</b> — I ping you when it’s time.',
  '',
  'Schedule with a duration:',
  '<code>/remind in 10m Buy milk</code>',
  '…or just send <code>2h Call mom</code> with no command.',
  '',
  'Units: <code>s</code>·<code>m</code>·<code>h</code>·<code>d</code>. See pending with /list.',
].join('\n');

interface ListView {
  text: string;
  keyboard?: InlineKeyboard;
}

@Router()
@UseInterceptors(LoggingInterceptor)
export class ReminderRouter {
  constructor(private readonly reminders: ReminderService) {}

  @Command('start')
  start(message: Message, @Sender() user: User) {
    return message.answer(
      `Hi, <b>${escapeHtml(user.first_name)}</b>!\n\n${HELP}`,
      { reply_markup: mainMenu() },
    );
  }

  @Command('help')
  @Hears(MENU.help)
  help(message: Message) {
    return message.answer(HELP);
  }

  @Hears(MENU.remind)
  promptRemind(message: Message) {
    return message.answer(
      'Send <code>/remind in 10m &lt;text&gt;</code> — or just <code>10m &lt;text&gt;</code>.',
    );
  }

  @Command('remind')
  remind(message: Message, @Payload() payload: string, @Sender() user: User) {
    return this.capture(message, payload, user);
  }

  @Command('list')
  @Hears(MENU.list)
  async list(message: Message) {
    const view = await this.renderList(message.chat.id);
    return view.keyboard
      ? message.answer(view.text, { reply_markup: view.keyboard })
      : message.answer(view.text);
  }

  @Action(DoneCb.filter())
  async done(query: CallbackQuery, @Data() data: { id: number }) {
    await this.reminders.markDone(data.id);
    await this.refresh(query);
    return query.answer('Done ✓');
  }

  @Action(DeleteCb.filter())
  async drop(query: CallbackQuery, @Data() data: { id: number }) {
    await this.reminders.remove(data.id);
    await this.refresh(query);
    return query.answer('Deleted 🗑');
  }

  /** Natural-language capture: a bare "10m Buy milk" with no command. */
  @Hears(/^(?:in\s+)?\d+\s*[smhd]\s+/i)
  quick(message: Message, @Sender() user: User) {
    return this.capture(message, message.text ?? '', user);
  }

  // --- helpers --------------------------------------------------------------

  private async capture(message: Message, input: string, user: User) {
    const parsed = parseReminder(input, new Date());
    if (!parsed) {
      return message.answer(
        'Couldn’t read a time from that. Example: <code>/remind in 10m Buy milk</code>.',
      );
    }
    await this.reminders.schedule(
      message.chat.id,
      user.id,
      parsed.text,
      parsed.dueAt,
    );
    return message.answer(
      `✅ Scheduled for <b>${parsed.dueAt.toLocaleString()}</b>:\n${escapeHtml(
        parsed.text,
      )}`,
    );
  }

  private async renderList(chatId: number | string): Promise<ListView> {
    const pending = await this.reminders.pendingFor(chatId);
    if (pending.length === 0) {
      return { text: 'No pending reminders 🎉' };
    }

    const keyboard = new InlineKeyboard();
    for (const reminder of pending) {
      keyboard
        .row()
        .text(`✓ ${truncate(reminder.text)}`, DoneCb.pack({ id: reminder.id }))
        .text('🗑', DeleteCb.pack({ id: reminder.id }));
    }
    return {
      text: `You have <b>${pending.length}</b> pending reminder(s):`,
      keyboard,
    };
  }

  private async refresh(query: CallbackQuery): Promise<void> {
    const chatId = query.message?.chat?.id;
    if (chatId === undefined) {
      return;
    }
    const view = await this.renderList(chatId);
    await (view.keyboard
      ? query.message?.editText(view.text, { reply_markup: view.keyboard })
      : query.message?.editText(view.text));
  }
}

function truncate(text: string, max = 24): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

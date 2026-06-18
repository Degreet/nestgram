import { ParseIntPipe, UseInterceptors } from '@nestjs/common';
import {
  Action,
  CallbackQuery,
  Command,
  escapeHtml,
  Hears,
  HearsKey,
  locale,
  Message,
  OnHelp,
  OnStart,
  Param,
  Router,
  Sender,
  t,
  User,
} from 'nestgram';

import { LoggingInterceptor } from '../common/logging.interceptor';
import { MENU } from '../common/menu.constants';
import { DEFAULT_LOCALE } from '../i18n/translations';
import { DELETE_ROUTE, DONE_ROUTE } from './reminder.routes';
import { Reminder } from './reminder.entity';
import { ReminderKeyboards } from './reminder.keyboards';
import { ReminderParser } from './reminder.parser';
import { ReminderService } from './reminder.service';

@Router()
@UseInterceptors(LoggingInterceptor)
export class ReminderRouter {
  private static readonly LEADING_COMMAND = /^\/\S+\s*/;
  private static readonly REMINDER_INPUT = /^(?:in\s+)?\d+\s*[smhd]\s+/i;

  constructor(
    private readonly reminders: ReminderService,
    private readonly parser: ReminderParser,
    private readonly keyboards: ReminderKeyboards,
  ) {}

  @OnStart()
  start(message: Message, @Sender() user: User) {
    return message.answer(
      t('start.greeting', {
        name: escapeHtml(user.first_name),
        help: t('help.text'),
      }),
      { reply_markup: this.keyboards.mainMenu() },
    );
  }

  @OnHelp()
  @HearsKey(MENU.help)
  help() {
    return t('help.text');
  }

  @HearsKey(MENU.remind)
  promptRemind() {
    return t('remind.prompt');
  }

  @Command('remind :text...')
  @Hears(ReminderRouter.REMINDER_INPUT)
  async remind(message: Message, @Sender() user: User) {
    const parsed = this.parser.parse(
      (message.text ?? '').replace(ReminderRouter.LEADING_COMMAND, ''),
      new Date(),
    );
    if (!parsed) {
      return t('remind.unparsable');
    }
    await this.reminders.schedule(
      message.chat.id,
      user.id,
      parsed.text,
      parsed.dueAt,
      locale() ?? DEFAULT_LOCALE,
    );
    return t('remind.scheduled', {
      time: parsed.dueAt.toLocaleString(),
      text: escapeHtml(parsed.text),
    });
  }

  @Command('list')
  @HearsKey(MENU.list)
  async list(message: Message) {
    const pending = await this.reminders.pendingFor(message.chat.id);
    return message.answer(this.listText(pending), {
      reply_markup: this.keyboards.list(pending),
    });
  }

  @Action(DONE_ROUTE)
  async done(query: CallbackQuery, @Param('id', ParseIntPipe) id: number) {
    await this.reminders.markDone(id);
    await this.refresh(query);
    return query.answer(t('list.done'));
  }

  @Action(DELETE_ROUTE)
  async drop(query: CallbackQuery, @Param('id', ParseIntPipe) id: number) {
    await this.reminders.remove(id);
    await this.refresh(query);
    return query.answer(t('list.deleted'));
  }

  private async refresh(query: CallbackQuery): Promise<void> {
    const chatId = query.message?.chat?.id;
    if (chatId === undefined) {
      return;
    }
    const pending = await this.reminders.pendingFor(chatId);
    await query.message?.editText(this.listText(pending), {
      reply_markup: this.keyboards.list(pending),
    });
  }

  private listText(pending: Reminder[]): string {
    return pending.length === 0
      ? t('list.empty')
      : t('list.header', { count: pending.length });
  }
}

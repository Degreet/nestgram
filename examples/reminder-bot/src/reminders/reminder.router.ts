import { UseInterceptors } from '@nestjs/common';
import {
  Action,
  CallbackQuery,
  Command,
  Data,
  escapeHtml,
  Hears,
  locale,
  Message,
  OnMessage,
  Payload,
  Router,
  Sender,
  t,
  User,
} from 'nestgram';

import { hearsMenu } from '../common/menu.predicate';
import { mainMenu } from '../common/main-menu.keyboard';
import { MENU } from '../common/menu.constants';
import { LoggingInterceptor } from '../common/logging.interceptor';
import { DEFAULT_LOCALE } from '../i18n/translations';
import { DeleteCb, DoneCb } from './reminder.callbacks';
import { ReminderParser } from './reminder.parser';
import { ReminderPresenter } from './reminder.presenter';
import { ReminderService } from './reminder.service';
import type { ReminderView } from './reminder-view.type';

@Router()
@UseInterceptors(LoggingInterceptor)
export class ReminderRouter {
  constructor(
    private readonly reminders: ReminderService,
    private readonly parser: ReminderParser,
    private readonly presenter: ReminderPresenter,
  ) {}

  @Command('start')
  start(message: Message, @Sender() user: User) {
    return message.answer(
      t('start.greeting', {
        name: escapeHtml(user.first_name),
        help: t('help.text'),
      }),
      { reply_markup: mainMenu() },
    );
  }

  @Command('help')
  @OnMessage(hearsMenu(MENU.help))
  help(message: Message) {
    return message.answer(t('help.text'));
  }

  @OnMessage(hearsMenu(MENU.remind))
  promptRemind(message: Message) {
    return message.answer(t('remind.prompt'));
  }

  @Command('remind')
  remind(message: Message, @Payload() payload: string, @Sender() user: User) {
    return this.capture(message, payload, user);
  }

  @Hears(/^(?:in\s+)?\d+\s*[smhd]\s+/i)
  quick(message: Message, @Sender() user: User) {
    return this.capture(message, message.text ?? '', user);
  }

  @Command('list')
  @OnMessage(hearsMenu(MENU.list))
  async list(message: Message) {
    const pending = await this.reminders.pendingFor(message.chat.id);
    return this.reply(message, this.presenter.list(pending));
  }

  @Action(DoneCb.filter())
  async done(query: CallbackQuery, @Data() data: { id: number }) {
    await this.reminders.markDone(data.id);
    await this.refresh(query);
    return query.answer(t('list.done'));
  }

  @Action(DeleteCb.filter())
  async drop(query: CallbackQuery, @Data() data: { id: number }) {
    await this.reminders.remove(data.id);
    await this.refresh(query);
    return query.answer(t('list.deleted'));
  }

  private async capture(message: Message, input: string, user: User) {
    const parsed = this.parser.parse(input, new Date());
    if (!parsed) {
      return message.answer(t('remind.unparsable'));
    }
    await this.reminders.schedule(
      message.chat.id,
      user.id,
      parsed.text,
      parsed.dueAt,
      locale() ?? DEFAULT_LOCALE,
    );
    return message.answer(
      t('remind.scheduled', {
        time: parsed.dueAt.toLocaleString(),
        text: escapeHtml(parsed.text),
      }),
    );
  }

  private reply(message: Message, view: ReminderView) {
    return view.keyboard
      ? message.answer(view.text, { reply_markup: view.keyboard })
      : message.answer(view.text);
  }

  private async refresh(query: CallbackQuery): Promise<void> {
    const chatId = query.message?.chat?.id;
    if (chatId === undefined) {
      return;
    }
    const view = this.presenter.list(await this.reminders.pendingFor(chatId));
    await (view.keyboard
      ? query.message?.editText(view.text, { reply_markup: view.keyboard })
      : query.message?.editText(view.text));
  }
}

import { Injectable } from '@nestjs/common';
import { InlineKeyboard, ReplyKeyboard, t } from 'nestgram';

import { MENU } from '../common/menu.constants';
import { DELETE_ROUTE, DONE_ROUTE } from './reminder.routes';
import { Reminder } from './reminder.entity';

@Injectable()
export class ReminderKeyboards {
  private readonly maxLabel = 24;

  mainMenu(): ReplyKeyboard {
    return new ReplyKeyboard()
      .text(t(MENU.remind))
      .text(t(MENU.list))
      .row()
      .text(t(MENU.help))
      .resize();
  }

  list(reminders: Reminder[]): InlineKeyboard | undefined {
    if (reminders.length === 0) {
      return undefined;
    }
    const keyboard = new InlineKeyboard();
    for (const reminder of reminders) {
      keyboard
        .row()
        .text(`✓ ${this.truncate(reminder.text)}`, DONE_ROUTE, {
          id: reminder.id,
        })
        .text('🗑', DELETE_ROUTE, { id: reminder.id });
    }
    return keyboard;
  }

  private truncate(text: string): string {
    return text.length > this.maxLabel
      ? `${text.slice(0, this.maxLabel - 1)}…`
      : text;
  }
}

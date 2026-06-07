import { Injectable } from '@nestjs/common';
import { InlineKeyboard, t } from 'nestgram';

import { DeleteCb, DoneCb } from './reminder.callbacks';
import type { Reminder } from './reminder.entity';
import type { ReminderView } from './reminder-view.type';

const MAX_LABEL = 24;

@Injectable()
export class ReminderPresenter {
  list(reminders: Reminder[]): ReminderView {
    if (reminders.length === 0) {
      return { text: t('list.empty') };
    }

    const keyboard = new InlineKeyboard();
    for (const reminder of reminders) {
      keyboard
        .row()
        .text(
          `✓ ${this.truncate(reminder.text)}`,
          DoneCb.pack({ id: reminder.id }),
        )
        .text('🗑', DeleteCb.pack({ id: reminder.id }));
    }
    return { text: t('list.header', { count: reminders.length }), keyboard };
  }

  private truncate(text: string): string {
    return text.length > MAX_LABEL ? `${text.slice(0, MAX_LABEL - 1)}…` : text;
  }
}

import type { InlineKeyboard } from 'nestgram';

export interface ReminderView {
  text: string;
  keyboard?: InlineKeyboard;
}

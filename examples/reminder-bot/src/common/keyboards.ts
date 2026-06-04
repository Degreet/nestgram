import { ReplyKeyboard } from 'nestgram';

/** The persistent reply-keyboard menu shown after `/start`. */
export const MENU = {
  remind: '➕ Remind',
  list: '📋 My reminders',
  help: 'ℹ️ Help',
} as const;

export function mainMenu(): ReplyKeyboard {
  return new ReplyKeyboard()
    .text(MENU.remind)
    .text(MENU.list)
    .row()
    .text(MENU.help)
    .resize();
}

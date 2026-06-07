import { ReplyKeyboard, t } from 'nestgram';

import { MENU } from './menu.constants';

export function mainMenu(): ReplyKeyboard {
  return new ReplyKeyboard()
    .text(t(MENU.remind))
    .text(t(MENU.list))
    .row()
    .text(t(MENU.help))
    .resize();
}

import { ShortcutMethods } from '../methods/ShortcutMethods';
import { Message, CallbackQuery } from '../updateObjects';

export interface Update {
  update_id: number;
  message?: Message;
  callback_query?: CallbackQuery;
}

export abstract class UpdateObject extends ShortcutMethods {
  updateTitle?: string;
}

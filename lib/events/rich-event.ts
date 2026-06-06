import type { BotService } from '../api';
import { TelegramObject } from './telegram-object';

/**
 * Base for the rich event classes that carry a Bot API payload. Holds the bot
 * handle (so an event can expose actions like `inlineQuery.answer(...)`) and
 * copies the raw payload's fields onto itself. Subclasses pair this with a
 * `declare`d `interface X extends RawX {}` (declaration merging) to type those
 * fields, and add their own action methods.
 */
export abstract class RichEvent extends TelegramObject {
  constructor(protected readonly bot: BotService, raw: object) {
    super();
    Object.assign(this, raw);
  }
}

import type { BotService } from '../api';
import { TelegramObject } from './telegram-object';

/**
 * Base for the rich event classes that carry a Bot API payload. Holds the bot
 * handle (so an event can expose actions like `inlineQuery.answer(...)`) and
 * copies the raw payload's fields onto itself. Subclasses pair this with a
 * `declare`d `interface X extends RawX {}` (declaration merging) to type those
 * fields, and add their own action methods.
 *
 * The handle is `botService`, not `bot`, because the payload is `Object.assign`ed
 * over it: `ManagedBotUpdated` has a spec field literally named `bot`, which
 * would otherwise overwrite the handle with a `User` at runtime. It also matches
 * what `Message` and `CallbackQuery` already call theirs.
 */
export abstract class RichEvent extends TelegramObject {
  constructor(protected readonly botService: BotService, raw: object) {
    super();
    Object.assign(this, raw);
  }
}

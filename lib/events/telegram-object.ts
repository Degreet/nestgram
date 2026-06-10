import { BotService } from '../api';

/**
 * Base class for rich event objects (`Message`, `CallbackQuery`, …). Holds the
 * shared machinery for wrapping a raw update into a class that carries both its
 * data and the actions you can take on it; subclasses add the typed fields and
 * `answer()`-style helpers.
 */
export abstract class TelegramObject {
  static mutateObjects<T extends TelegramObject>(
    botService: BotService,
    instance: T,
    objects: Record<
      string,
      new (botService: BotService, from: any) => TelegramObject
    >,
  ) {
    const target = instance as unknown as Record<string, unknown>;
    for (const [key, value] of Object.entries(objects)) {
      // An absent optional field stays absent — wrapping `undefined` would
      // fabricate a hollow rich object and break `if (event.field)` guards.
      if (target[key] === undefined) continue;
      target[key] = new value(botService, target[key]);
    }
  }
}

import { BotService } from '../api';

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
      target[key] = new value(botService, target[key]);
    }
  }
}

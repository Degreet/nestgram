import { BotService } from '../bot';

export abstract class TelegramObject {
  static mutateObjects<T extends TelegramObject>(
    botService: BotService,
    instance: T,
    objects: Record<
      string,
      new (botService: BotService, from: any) => TelegramObject
    >,
  ) {
    for (const [key, value] of Object.entries(objects)) {
      instance[key] = new value(botService, instance[key]);
    }
  }
}

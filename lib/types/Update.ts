import { ShortcutMethods } from '../methods/ShortcutMethods';
import { Message, CallbackQuery } from '../updateObjects';
import { BotService } from '../bot';

export interface Update {
  update_id: number;
  message?: Message;
  edited_message?: Message;
  channel_post?: Message;
  edited_channel_post?: Message;
  business_message?: Message;
  edited_business_message?: Message;
  callback_query?: CallbackQuery;
}

export abstract class UpdateObject extends ShortcutMethods {
  updateTitle?: string;
  originalUpdate?: Update;

  static fromObject<T extends UpdateObject>(
    this: { new (botService: BotService): T },
    botService: BotService,
    object: any,
  ): T {
    const instance = new this(botService);
    Object.assign(instance, object);
    return instance;
  }

  static fromUpdate<T extends UpdateObject>(
    this: { new (botService: BotService): T } & {
      fromObject: (botService: BotService, object: any) => T;
    },
    botService: BotService,
    update: Update,
    updateType: string,
  ): T {
    const instance = this.fromObject(botService, update[updateType]);
    instance.originalUpdate = update;
    instance.updateTitle = updateType;
    return instance;
  }
}

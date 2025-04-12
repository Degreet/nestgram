import { ShortcutMethods } from '../methods/ShortcutMethods';
import { BotService } from '../bot';
import { Update } from '../types';

type UpdateObjectClassReference<T extends UpdateObject = UpdateObject> = {
  new (botService: BotService): T;
} & {
  fromObject: (botService: BotService, object: any) => T;
  mutateObjects: (botService: BotService, instance: T) => void;
};

export abstract class UpdateObject extends ShortcutMethods {
  protected objectReferences?: Record<string, UpdateObjectClassReference>;

  updateTitle?: string;
  originalUpdate?: Update;

  static mutateObjects<T extends UpdateObject>(
    botService: BotService,
    instance: T,
  ) {
    const entries = Object.entries(instance.objectReferences ?? []);
    for (const [key, value] of entries) {
      instance[key] = value.fromObject(botService, instance[key]);
    }
  }

  static fromObject<T extends UpdateObject>(
    this: UpdateObjectClassReference<T>,
    botService: BotService,
    object: any,
  ): T {
    const instance = new this(botService);
    Object.assign(instance, object);
    this.mutateObjects(botService, instance);
    return instance;
  }

  static fromUpdate<T extends UpdateObject>(
    this: UpdateObjectClassReference<T>,
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

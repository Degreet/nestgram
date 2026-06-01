import { Constructor } from '@nestjs/common/utils/merge-with-values.util';
import { TelegramObject } from '../../events';

const TELEGRAM_OBJECT_REGISTRY = new Map<string, Constructor<TelegramObject>>();

export function UpdateType(...types: string[]) {
  return (target: Constructor<TelegramObject>) => {
    for (const type of types) {
      TELEGRAM_OBJECT_REGISTRY.set(type, target);
    }
  };
}

export function getTelegramObjectByUpdateType(updateType: string) {
  return TELEGRAM_OBJECT_REGISTRY.get(updateType);
}

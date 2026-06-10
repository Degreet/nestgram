import { TelegramObject } from '../../events';

/** A concrete rich-event class (importing Nest's internal Constructor util
 * would tie the published package to a deep path that can move in any minor). */
type Constructor<T> = new (...args: any[]) => T;

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

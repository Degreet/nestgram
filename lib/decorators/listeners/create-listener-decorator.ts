import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

import { RoutePredicate } from '../../engine/matching';
import { ListenerOptions } from '../listener-options';
import { Metadata } from '../metadata.enum';
import { Event } from '../params/event.decorator';

export const createListenerDecorator = (
  updateType: string,
  ...predicates: RoutePredicate[]
): MethodDecorator => {
  return (
    target: object,
    key: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const existingMetadata: ListenerOptions[] | undefined = Reflect.getMetadata(
      Metadata.LISTENERS,
      descriptor.value,
    );

    const options: ListenerOptions = { updateType, predicates };

    const newMetadata = [...(existingMetadata ?? []), options];

    Reflect.defineMetadata(Metadata.LISTENERS, newMetadata, descriptor.value);

    ensureEventOnFirstParam(target, key, descriptor);

    // A method decorator must NOT return the target: a returned value becomes
    // the descriptor for the next decorator in a stack, which breaks stacking
    // (`@OnMessage() @OnCallbackQuery() handle()`). Return void.
  };
};

/**
 * Auto-apply `@Event()` to the handler's first parameter unless the author
 * already decorated it.
 *
 * ECC param resolution is all-or-nothing (ECC-NOTES.md): with a
 * `ParamsFactory` present, any undecorated parameter resolves to `undefined`.
 * Backing the positional event with an implicit `@Event()` lets the bot author
 * write `handle(message: Message)` (no decorator) and still receive the event,
 * while `@Sender()`/`@Args()`/… on later params keep working. Parameter
 * decorators run before method decorators, so a param 0 the author decorated
 * themselves is already recorded and we leave it alone. Idempotent across
 * stacked listener decorators.
 */
function ensureEventOnFirstParam(
  target: object,
  key: string | symbol,
  descriptor: PropertyDescriptor,
): void {
  const handler = descriptor.value;
  if (typeof handler !== 'function') {
    return;
  }

  const args: Record<string, { index: number }> =
    Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) ?? {};
  const decoratedIndexes = Object.values(args).map((m) => m.index);

  // Skip only a genuinely param-less handler. `handler.length` undercounts
  // rest/defaulted params, so a method with any decorated param still counts as
  // taking parameters even if its arity reads 0.
  if (handler.length < 1 && decoratedIndexes.length === 0) {
    return;
  }

  if (!decoratedIndexes.includes(0)) {
    Event()(target, key, 0);
  }
}

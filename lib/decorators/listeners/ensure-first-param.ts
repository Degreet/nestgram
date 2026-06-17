import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

/**
 * Auto-applies a parameter decorator to a handler's first parameter unless the
 * author already decorated it.
 *
 * Lets the bot author write a bare typed first argument (`handle(message:
 * Message)`) and still receive the value, while their own `@Sender()`/`@Args()`/…
 * on param 0 is left alone. Parameter decorators run before method decorators,
 * so a param 0 the author decorated is already recorded by the time a method
 * decorator calls this. Idempotent across stacked decorators.
 *
 * Shared by `createListenerDecorator` (applies `@Event`) and `@OnUnhandled`
 * (applies the raw-update param) — the same "bare first arg" ergonomics.
 */
export function ensureFirstParamDecorated(
  target: object,
  key: string | symbol,
  descriptor: PropertyDescriptor,
  paramDecorator: ParameterDecorator,
): void {
  const handler = descriptor.value;
  if (typeof handler !== 'function') {
    return;
  }

  const args: Record<string, { index: number }> =
    Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) ?? {};
  const decoratedIndexes = Object.values(args).map((m) => m.index);

  // `handler.length` undercounts rest/defaulted params, so a method with any
  // decorated param still counts as taking parameters even if its arity reads 0.
  if (handler.length < 1 && decoratedIndexes.length === 0) {
    return;
  }

  if (!decoratedIndexes.includes(0)) {
    paramDecorator(target, key, 0);
  }
}

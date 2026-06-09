// `import type`: a type-only edge is erased at runtime, so re-exporting this from
// the decorators barrel (which low-level code imports) cannot close a module
// cycle — same discipline as `createListenerDecorator`.
import type { RoutePredicate } from '../engine/matching';
import { Metadata } from './metadata.enum';

/**
 * Adds method-level match predicates that AND into EVERY route the method
 * declares — across all its listener decorators at once.
 *
 * Where a listener's own predicates narrow a single route (`@OnMessage(a, b)` →
 * that message route only), `@Match(p)` narrows the whole handler regardless of
 * how many update types it listens to:
 *
 * ```ts
 * @OnMessage()
 * @OnCallbackQuery()
 * @Match(fromAdmin)   // (message OR callback) AND fromAdmin
 * handle(event: Message | CallbackQuery) {}
 * ```
 *
 * Generic and routing-agnostic — the engine merges these at boot without knowing
 * what they test, so a bot author (and built-ins like `@AnyState()`/`@NoState()`)
 * compose with it freely. Order relative to the listener decorators does not
 * matter: they live under a separate metadata key and are merged in
 * `RouteExplorer`, so `@Match` placed above or below `@OnMessage` behaves the
 * same. Used alone (no listener) it is a no-op — there is no route to narrow.
 */
export const Match = (...predicates: RoutePredicate[]): MethodDecorator => {
  return (_target, _key, descriptor: PropertyDescriptor) => {
    const existing: RoutePredicate[] =
      Reflect.getMetadata(Metadata.MATCH, descriptor.value) ?? [];
    Reflect.defineMetadata(
      Metadata.MATCH,
      [...existing, ...predicates],
      descriptor.value,
    );
  };
};

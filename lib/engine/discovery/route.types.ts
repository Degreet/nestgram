import { RoutePredicate } from '../matching';

/**
 * A single resolved route in the boot-time route table: a router method bound
 * to one listener decorator. A method may carry several listeners, each
 * producing its own route. Built once at startup, never per update.
 */
export interface Route {
  /** The Telegram update type this handler listens to (e.g. `'message'`). */
  readonly updateType: string;
  /** Per-listener match predicates declared on the decorator. */
  readonly predicates: RoutePredicate[];
  /** The router instance that owns the handler. */
  readonly instance: object;
  /** The handler method name on that instance. */
  readonly methodName: string;
  /**
   * A reply fixed at boot — the declarative form of `return string`. When set,
   * the dispatcher emits this string instead of invoking the handler. A scene
   * step's reprompt is one consumer, but the capability is generic.
   */
  readonly reply?: string;
}

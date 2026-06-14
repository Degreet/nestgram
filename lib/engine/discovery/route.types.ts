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
   * A static reply: when set, the dispatcher replies this string instead of
   * invoking the handler. Used by a scene step's reprompt (`@Step({ invalid })`),
   * which fires when the strict step route's filter rejected the update.
   */
  readonly reply?: string;
}

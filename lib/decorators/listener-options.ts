import { RoutePredicate } from '../engine/matching';

export interface ListenerOptions {
  updateType: string;
  predicates?: RoutePredicate[];
  /**
   * A static reply for this route — when set, the dispatcher replies it instead
   * of invoking the handler. Used by a scene step's reprompt (`@Step({ invalid })`).
   */
  reply?: string;
  /**
   * Routes from a deferred listener are emitted AFTER every non-deferred route of
   * the same method, regardless of decorator order — so a fallback (e.g. a scene
   * step's reprompt) is always tried only once the strict route declined.
   */
  deferred?: boolean;
}

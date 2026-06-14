import { RoutePredicate } from '../engine/matching';

export interface ListenerOptions {
  updateType: string;
  predicates?: RoutePredicate[];
  /**
   * A reply fixed at boot — the declarative form of `return string`. When set,
   * the dispatcher emits this reply instead of invoking the handler. One consumer
   * is a scene step's reprompt (`@Step({ invalid })`), but the capability is
   * generic.
   */
  reply?: string;
  /**
   * Sorts this listener's routes after all non-deferred routes of the same
   * method, independent of decorator order — so a fallback is tried only once the
   * strict route declines. A scene step's reprompt uses this, but any
   * last-resort route can.
   */
  deferred?: boolean;
}

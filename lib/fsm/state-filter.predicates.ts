import type { RoutePredicate } from '../engine/matching';
import { currentStateId } from './fsm.ambient';

/**
 * Internal predicates behind the `@AnyState()` / `@NoState()` decorators. Kept
 * out of the public barrel on purpose: a meta-condition on the current state is
 * surfaced as a decorator, never as a loose global predicate value (specific
 * states ARE passed inline, but "any"/"none" read better as `@AnyState()`).
 */

/** Matches when ANY FSM flow is active. */
export const anyState: RoutePredicate = {
  matches: () => currentStateId() !== null,
};

/** Matches when NO FSM flow is active (idle). */
export const noState: RoutePredicate = {
  matches: () => currentStateId() === null,
};

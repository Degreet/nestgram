import type { RoutePredicate } from '../engine/matching';
import { activeSceneId } from './scene.ambient';

/**
 * Internal predicates behind the `@InScene()` / `@NoScene()` decorators. Kept out
 * of the public barrel: a meta-condition on the active scene is surfaced as a
 * decorator, never as a loose global predicate value (a specific scene is gated
 * by its own `@Step()`; "any"/"none" read better as `@InScene()`/`@NoScene()`).
 */

/** Matches when ANY scene is active. */
export const inScene: RoutePredicate = {
  matches: () => activeSceneId() !== null,
};

/** Matches when NO scene is active (idle). */
export const noScene: RoutePredicate = {
  matches: () => activeSceneId() === null,
};

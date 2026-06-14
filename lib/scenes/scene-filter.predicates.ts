import type { RoutePredicate } from '../engine/matching';
import { activeSceneId } from './scene.ambient';

/**
 * The predicates behind the scene route gate. Kept out of the public barrel: the
 * scene-capture rule is surfaced through `@Step()` (a scene's own steps) and the
 * `@InScene()` opt-out, never as loose global predicate values.
 *
 * An active scene CAPTURES input — while it runs, only its `@Step()` routes and
 * `@InScene()`-exempt routes match; every other route is suppressed. The
 * suppression is implemented by ANDing {@link idle} onto every non-step,
 * non-exempt route at boot (see `SceneRouteGate`), so it composes with the
 * route's own filters and needs no per-update branch in the engine.
 */

/** Matches only when NO scene is active (idle) — the gate ANDed onto suppressed routes. */
export const idle: RoutePredicate = {
  matches: () => activeSceneId() === null,
};

/**
 * The `@InScene()` marker predicate. Always matches — it changes nothing about
 * routing on its own; it is a tag the route gate detects (by identity) to leave a
 * route exempt from scene suppression. A singleton, so the gate can recognise it
 * across the route table with `predicates.includes(inSceneMarker)`.
 */
export const inSceneMarker: RoutePredicate = {
  matches: () => true,
};

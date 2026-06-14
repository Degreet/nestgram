import { Injectable } from '@nestjs/common';

import { Route, RouteTransform } from '../engine/discovery';
import { idle, inSceneMarker } from './scene-filter.predicates';
import { StepPredicate } from './step.predicate';

/**
 * Makes an active scene CAPTURE input, at boot, with no per-update engine branch.
 *
 * While a scene is active, only its `@Step()` routes and `@InScene()`-exempt
 * routes may match — every other handler is suppressed. That rule is exactly
 * "AND a scene-is-idle gate onto every route that is neither a `@Step` route nor
 * `@InScene()`-marked", so this transform walks the freshly explored table once
 * and prepends {@link idle} to those routes. `@Step` routes already self-gate to
 * their scene+ordinal via {@link StepPredicate}; `@InScene()` routes carry the
 * {@link inSceneMarker} tag and are left untouched.
 *
 * Scene awareness lives entirely here in `lib/scenes`; the engine only knows it
 * runs `@RouteTransform`s, not what they do. Discovered like any transform —
 * present only when `ScenesModule` is imported, so a scene-free app is unaffected.
 */
@Injectable()
@RouteTransform()
export class SceneRouteGate implements RouteTransform {
  transform(routes: Route[]): Route[] {
    return routes.map((route) =>
      SceneRouteGate.isExempt(route) ? route : SceneRouteGate.gate(route),
    );
  }

  /** A `@Step` route or an `@InScene()`-marked route escapes scene suppression. */
  private static isExempt(route: Route): boolean {
    return route.predicates.some(
      (predicate) =>
        predicate instanceof StepPredicate || predicate === inSceneMarker,
    );
  }

  /** AND the idle gate onto a suppressed route, leaving its own predicates intact. */
  private static gate(route: Route): Route {
    return { ...route, predicates: [idle, ...route.predicates] };
  }
}

import type { RoutePredicate } from '../engine/matching';
import { currentSnapshot } from './scene.ambient';

/**
 * Routes a `@Step()` handler: matches only while ITS scene is active AND the
 * active step is its ordinal — the scene analog of {@link FsmState}, ANDed onto
 * the step's own `@On*` filters via `@Match`.
 *
 * Scene id and ordinal are not known at decoration time (ordinal = declaration
 * order, resolved once the whole class is scanned), so the predicate is created
 * empty by `@Step()` and {@link bind} is filled in by the scene registry at boot.
 * The object is shared by reference: the route table holds it, the registry fills
 * it, and it is read per update — late binding, no per-update cost.
 */
export class StepPredicate implements RoutePredicate {
  private sceneId?: string;
  private ordinal?: number;

  /** Fill in the scene id + ordinal once the class is scanned (boot-time). */
  bind(sceneId: string, ordinal: number): void {
    this.sceneId = sceneId;
    this.ordinal = ordinal;
  }

  matches(): boolean {
    const snapshot = currentSnapshot();
    if (!snapshot || snapshot.active === null) {
      return false;
    }
    return snapshot.active === this.sceneId && snapshot.step === this.ordinal;
  }
}
